import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import OpenAI, { toFile } from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { WHISPER_SIZE_LIMIT, CHUNK_DURATION_SECONDS } from '@/lib/constants';

// Use the bundled ffmpeg binary (works in all environments)
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Split an audio file into chunks using ffmpeg segment muxer.
 * Returns an array of absolute file paths to the generated chunks.
 */
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
        '-c copy', // no re-encoding — fast and lossless
        '-reset_timestamps 1',
      ])
      .output(outputPattern)
      .on('end', () => {
        // Collect all generated chunk files in order
        fs.promises.readdir(tmpDir).then((dir) => {
          const prefix = `chunk_${sessionId}_`;
          const chunks = dir
            .filter((f) => f.startsWith(prefix))
            .sort() // safe: ffmpeg uses %03d zero-padding
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

/**
 * Transcribe a single audio file chunk using OpenAI Whisper API.
 * Retries up to 3 times with exponential backoff on transient failures.
 */
async function transcribeChunk(openai: OpenAI, chunkPath: string, retries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const stream = fs.createReadStream(chunkPath);
      const filename = path.basename(chunkPath);

      const response = await openai.audio.transcriptions.create({
        file: await toFile(stream, filename),
        model: 'whisper-1',
        response_format: 'text',
      });

      // response_format: 'text' returns a plain string
      return response as unknown as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Whisper API failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Transcribe an audio file.
 * If the file exceeds 25MB, it is split into segments first.
 * Chunks are processed sequentially to avoid Whisper rate limits.
 * All temporary chunk files are cleaned up in the finally block.
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stats = await fs.promises.stat(filePath);
  const chunkPaths: string[] = [];

  try {
    if (stats.size <= WHISPER_SIZE_LIMIT) {
      // Small file — send directly
      return await transcribeChunk(openai, filePath);
    }

    // Large file — split then transcribe sequentially
    const chunks = await splitAudioIntoChunks(filePath, CHUNK_DURATION_SECONDS);
    chunkPaths.push(...chunks);

    const transcripts: string[] = [];
    for (const chunk of chunks) {
      const text = await transcribeChunk(openai, chunk);
      transcripts.push(text.trim());
    }

    return transcripts.join('\n');
  } finally {
    // Clean up chunk files (the original file is cleaned up by the pipeline)
    await Promise.allSettled(chunkPaths.map((chunk) => fs.promises.unlink(chunk)));
  }
}
