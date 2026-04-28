import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import OpenAI, { toFile } from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { WHISPER_SIZE_LIMIT, CHUNK_DURATION_SECONDS } from '@/lib/constants';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export type TranscribeProvider = 'groq' | 'openai';

export interface TranscribeResult {
  text: string;
  provider: TranscribeProvider;
  durationSeconds: number;
}

interface ProviderConfig {
  client: OpenAI;
  model: string;
  name: TranscribeProvider;
}

function getGroqProvider(): ProviderConfig | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    name: 'groq',
    model: 'whisper-large-v3',
    client: new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' }),
  };
}

function getOpenAIProvider(): ProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    name: 'openai',
    model: 'whisper-1',
    client: new OpenAI({ apiKey }),
  };
}

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data?.format?.duration) {
        resolve(0);
        return;
      }
      resolve(data.format.duration);
    });
  });
}

function splitAudioIntoChunks(
  filePath: string,
  chunkDuration: number,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath) || '.mp3';
    const tmpDir = path.dirname(filePath);
    const sessionId = randomUUID().slice(0, 8);
    const outputPattern = path.join(tmpDir, `chunk_${sessionId}_%03d${ext}`);

    ffmpeg(filePath)
      .outputOptions([
        '-f segment',
        `-segment_time ${chunkDuration}`,
        '-c copy',
        '-reset_timestamps 1',
      ])
      .output(outputPattern)
      .on('end', () => {
        fs.promises.readdir(tmpDir).then((dir) => {
          const prefix = `chunk_${sessionId}_`;
          const chunks = dir
            .filter((f) => f.startsWith(prefix))
            .sort()
            .map((f) => path.join(tmpDir, f));
          resolve(chunks);
        }).catch(reject);
      })
      .on('error', (err) => {
        reject(new Error(`ffmpeg segmentation failed: ${err.message}`));
      })
      .run();
  });
}

const WHISPER_TIMEOUT_MS = 10 * 60 * 1000;

async function transcribeChunkWithProvider(
  provider: ProviderConfig,
  chunkPath: string,
  retries: number,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WHISPER_TIMEOUT_MS);

    try {
      const stream = fs.createReadStream(chunkPath);
      const filename = path.basename(chunkPath);

      const response = await provider.client.audio.transcriptions.create(
        {
          file: await toFile(stream, filename),
          model: provider.model,
          response_format: 'text',
        },
        { signal: controller.signal },
      );

      return response as unknown as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`${provider.name} transcription timed out after ${WHISPER_TIMEOUT_MS / 60000} minutes`);
      }
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`${provider.name} failed after ${retries} attempts: ${lastError?.message}`);
}

async function transcribeChunk(
  primary: ProviderConfig,
  fallback: ProviderConfig | null,
  chunkPath: string,
): Promise<{ text: string; provider: TranscribeProvider }> {
  try {
    const text = await transcribeChunkWithProvider(primary, chunkPath, 3);
    return { text, provider: primary.name };
  } catch (err) {
    if (!fallback) throw err;
    console.warn(
      `[transcribe] ${primary.name} failed, falling back to ${fallback.name}:`,
      err instanceof Error ? err.message : err,
    );
    const text = await transcribeChunkWithProvider(fallback, chunkPath, 3);
    return { text, provider: fallback.name };
  }
}

export interface TranscribeOptions {
  onProgress?: (note: string) => void | Promise<void>;
}

/**
 * Transcribe an audio file. Prefers Groq Whisper (cheap & fast), falls back to OpenAI on failure.
 * Large files are split into chunks; each chunk independently chooses provider so a transient
 * Groq blip mid-file only costs one chunk's fallback.
 */
export async function transcribeAudio(
  filePath: string,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const { onProgress } = options;
  const groq = getGroqProvider();
  const openai = getOpenAIProvider();

  if (!groq && !openai) {
    throw new Error('No transcription provider configured: set GROQ_API_KEY or OPENAI_API_KEY');
  }

  const primary = groq ?? openai!;
  const fallback = groq ? openai : null;

  const stats = await fs.promises.stat(filePath);
  const durationSeconds = await probeDuration(filePath);
  const chunkPaths: string[] = [];

  try {
    if (stats.size <= WHISPER_SIZE_LIMIT) {
      await onProgress?.(`轉錄中…（${primary.name}）`);
      const { text, provider } = await transcribeChunk(primary, fallback, filePath);
      return { text, provider, durationSeconds };
    }

    await onProgress?.('音檔較大，分段中…');
    const chunks = await splitAudioIntoChunks(filePath, CHUNK_DURATION_SECONDS);
    chunkPaths.push(...chunks);

    const transcripts: string[] = [];
    const providersUsed = new Set<TranscribeProvider>();
    for (let i = 0; i < chunks.length; i++) {
      await onProgress?.(`轉錄中 (${i + 1}/${chunks.length})…`);
      const { text, provider } = await transcribeChunk(primary, fallback, chunks[i]);
      transcripts.push(text.trim());
      providersUsed.add(provider);
    }

    // If any chunk fell back, report 'openai' so cost accounting reflects the more expensive path
    const reportedProvider: TranscribeProvider =
      providersUsed.has('openai') ? 'openai' : primary.name;

    return {
      text: transcripts.join('\n'),
      provider: reportedProvider,
      durationSeconds,
    };
  } finally {
    await Promise.allSettled(chunkPaths.map((chunk) => fs.promises.unlink(chunk)));
  }
}
