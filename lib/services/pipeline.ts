import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from './transcription';
import { summarizeTranscript } from './summarization';
import { EPISODE_STATUS } from '@/lib/constants';

/**
 * Download a remote audio file to a local temp path.
 * Returns the local file path.
 */
async function downloadRemoteFile(url: string, episodeId: string): Promise<string> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download audio: HTTP ${response.status} from ${url}`);
  }

  // Determine file extension from URL or Content-Type
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
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(tmpPath, Buffer.from(buffer));
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
    });

    // ── Step 1: Transcription ──────────────────────────────────────────────
    await prisma.episode.update({
      where: { id: episodeId },
      data: { status: EPISODE_STATUS.TRANSCRIBING },
    });

    if (!episode.audioUrl) {
      throw new Error('Episode has no audioUrl to process');
    }

    if (isLocalTmpPath(episode.audioUrl)) {
      // Uploaded file — already on disk
      tmpFilePath = episode.audioUrl;
    } else {
      // RSS episode — download first
      downloadedFile = await downloadRemoteFile(episode.audioUrl, episodeId);
      tmpFilePath = downloadedFile;
    }

    const transcript = await transcribeAudio(tmpFilePath);

    await prisma.episode.update({
      where: { id: episodeId },
      data: { transcript, status: EPISODE_STATUS.SUMMARIZING },
    });

    // ── Step 2: Summarization ──────────────────────────────────────────────
    const summaryResult = await summarizeTranscript(transcript);

    await prisma.$transaction([
      prisma.summary.create({
        data: {
          episodeId,
          overview: summaryResult.overview,
          keyPoints: JSON.stringify(summaryResult.keyPoints),
          quotes: JSON.stringify(summaryResult.quotes),
          tags: JSON.stringify(summaryResult.tags),
        },
      }),
      prisma.episode.update({
        where: { id: episodeId },
        data: { status: EPISODE_STATUS.DONE },
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
    // Clean up downloaded RSS file (uploaded files are cleaned here too)
    const fileToDelete = downloadedFile ?? tmpFilePath;
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try {
        fs.unlinkSync(fileToDelete);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
