import fs from 'fs';
import path from 'path';
import { pipeline as streamPipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from './transcription';
import { summarizeTranscript } from './summarization';
import { EPISODE_STATUS, MAX_DOWNLOAD_BYTES } from '@/lib/constants';

// Private IP ranges that should not be accessible via SSRF
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local
  /^::1$/,       // IPv6 loopback
  /^fc00:/,      // IPv6 private
];

/**
 * Validate that a URL is safe to fetch (not pointing to internal/private networks).
 */
function assertUrlSafe(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '0.0.0.0') {
    throw new Error('Access to localhost is not allowed');
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`Access to private/internal network addresses is not allowed`);
    }
  }
}

/**
 * Download a remote audio file to a local temp path using streaming.
 * Enforces size limits and SSRF protection.
 */
async function downloadRemoteFile(url: string, episodeId: string): Promise<string> {
  assertUrlSafe(url);

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download audio: HTTP ${response.status} from ${url}`);
  }

  // Check Content-Length before downloading
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `Remote file too large: ${Math.round(contentLength / 1024 / 1024)}MB exceeds ${Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024)}MB limit`,
    );
  }

  // Determine file extension from Content-Type or URL
  const contentType = response.headers.get('content-type') ?? '';
  let ext = '.mp3';
  if (contentType.includes('wav')) ext = '.wav';
  else if (contentType.includes('ogg')) ext = '.ogg';
  else if (contentType.includes('m4a') || contentType.includes('mp4')) ext = '.m4a';
  else {
    const urlExt = path.extname(new URL(url).pathname);
    if (urlExt) ext = urlExt;
  }

  const tmpPath = `/tmp/rss-${episodeId}-${randomUUID().slice(0, 8)}${ext}`;

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  // Stream to disk, counting bytes to enforce size limit
  let bytesWritten = 0;
  const writeStream = fs.createWriteStream(tmpPath);

  const countingStream = new Readable({
    read() {},
  });

  // Process body as a web ReadableStream → Node Readable
  const reader = response.body.getReader();
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesWritten += value.byteLength;
      if (bytesWritten > MAX_DOWNLOAD_BYTES) {
        reader.cancel();
        writeStream.destroy();
        // Clean up partial file
        fs.promises.unlink(tmpPath).catch(() => {});
        throw new Error(
          `Remote file exceeds ${Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024)}MB size limit`,
        );
      }
      countingStream.push(Buffer.from(value));
    }
    countingStream.push(null);
    await streamPipeline(countingStream, writeStream);
  } finally {
    reader.releaseLock();
  }

  return tmpPath;
}

/**
 * Check if a path is a local /tmp file path (uploaded file).
 */
function isLocalTmpPath(audioUrl: string): boolean {
  return audioUrl.startsWith('/tmp/');
}

/**
 * Process an episode through the full pipeline:
 *   pending → transcribing → summarizing → done (or error)
 *
 * This function is called fire-and-forget — do NOT await it in API routes.
 * The caller is responsible for returning the HTTP response before this runs.
 */
export async function processEpisode(episodeId: string): Promise<void> {
  let tmpFilePath: string | null = null;
  let downloadedFile: string | null = null;

  try {
    const episode = await prisma.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { summary: true },
    });

    // ── Step 1: Transcription ──────────────────────────────────────────────
    // Skip if transcript already exists (e.g. retrying after a summary failure)
    let transcript = episode.transcript ?? '';

    if (!transcript) {
      await prisma.episode.update({
        where: { id: episodeId },
        data: { status: EPISODE_STATUS.TRANSCRIBING },
      });

      if (!episode.audioUrl) {
        throw new Error('Episode has no audioUrl to process');
      }

      if (isLocalTmpPath(episode.audioUrl)) {
        tmpFilePath = episode.audioUrl;
      } else {
        downloadedFile = await downloadRemoteFile(episode.audioUrl, episodeId);
        tmpFilePath = downloadedFile;
      }

      if (!tmpFilePath) throw new Error('No audio file path to transcribe');
      transcript = await transcribeAudio(tmpFilePath);

      await prisma.episode.update({
        where: { id: episodeId },
        data: { transcript, status: EPISODE_STATUS.SUMMARIZING },
      });
    } else {
      // Transcript exists — jump straight to summarizing
      await prisma.episode.update({
        where: { id: episodeId },
        data: { status: EPISODE_STATUS.SUMMARIZING },
      });
    }

    // ── Step 2: Summarization ──────────────────────────────────────────────
    const summaryResult = await summarizeTranscript(transcript);

    // Use upsert so retries don't fail when a summary already exists
    await prisma.$transaction([
      prisma.summary.upsert({
        where: { episodeId },
        create: {
          episodeId,
          overview: summaryResult.overview,
          keyPoints: summaryResult.keyPoints,
          quotes: summaryResult.quotes,
          tags: summaryResult.tags,
        },
        update: {
          overview: summaryResult.overview,
          keyPoints: summaryResult.keyPoints,
          quotes: summaryResult.quotes,
          tags: summaryResult.tags,
        },
      }),
      prisma.episode.update({
        where: { id: episodeId },
        data: { status: EPISODE_STATUS.DONE, errorMsg: null },
      }),
    ]);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error occurred';
    await prisma.episode
      .update({
        where: { id: episodeId },
        data: { status: EPISODE_STATUS.ERROR, errorMsg },
      })
      .catch((e) => console.error('Failed to update error status:', e));
  } finally {
    // Clean up temp files
    const fileToDelete = downloadedFile ?? tmpFilePath;
    if (fileToDelete) {
      fs.promises.unlink(fileToDelete).catch(() => {});
    }
  }
}
