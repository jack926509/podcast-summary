/**
 * Lazy server startup — runs once on the first API request.
 * Replaces the instrumentation hook so no experimental Next.js flag is needed.
 */
let startupPromise: Promise<void> | null = null;

export function ensureStartup(): Promise<void> {
  if (!startupPromise) {
    startupPromise = runStartup();
  }
  return startupPromise;
}

async function runStartup(): Promise<void> {
  try {
    const { recoverStaleEpisodes } = await import('@/lib/services/recovery');
    await recoverStaleEpisodes();
  } catch (err) {
    // Recovery failure must not block API responses
    console.error('[startup] Recovery failed:', err);
  }
}
