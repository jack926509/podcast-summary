import fs from 'fs/promises';
import path from 'path';

/**
 * Lazy server startup — runs once on the first API request.
 * 1. Recovers stale episodes (transcribing/summarizing) after a crash
 * 2. Cleans up orphaned /tmp audio files older than 1 hour
 */
let startupPromise: Promise<void> | null = null;

export function ensureStartup(): Promise<void> {
  if (!startupPromise) {
    startupPromise = runStartup();
  }
  return startupPromise;
}

async function runStartup(): Promise<void> {
  await Promise.allSettled([
    recoverEpisodes(),
    cleanStaleTmpFiles(),
  ]);
}

async function recoverEpisodes(): Promise<void> {
  try {
    const { recoverStaleEpisodes } = await import('@/lib/services/recovery');
    await recoverStaleEpisodes();
  } catch (err) {
    console.error('[startup] Recovery failed:', err);
  }
}

async function cleanStaleTmpFiles(): Promise<void> {
  const TMP_DIR = '/tmp';
  const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
  // Matches: rss-*, chunk_*, upload-*, podcast-*
  const TMP_PATTERN = /^(rss-|chunk_|upload-|podcast-)/;

  try {
    const entries = await fs.readdir(TMP_DIR);
    const now = Date.now();
    let cleaned = 0;

    await Promise.allSettled(
      entries
        .filter((f) => TMP_PATTERN.test(f))
        .map(async (f) => {
          const fullPath = path.join(TMP_DIR, f);
          const stat = await fs.stat(fullPath).catch(() => null);
          if (stat && now - stat.mtimeMs > MAX_AGE_MS) {
            await fs.unlink(fullPath).catch(() => {});
            cleaned++;
          }
        }),
    );

    if (cleaned > 0) {
      console.log(`[startup] Cleaned up ${cleaned} stale tmp file(s)`);
    }
  } catch (err) {
    console.error('[startup] Tmp cleanup failed:', err);
  }
}
