/**
 * Next.js Instrumentation hook — runs once when the server starts.
 * Used to recover stale episodes after a crash or restart.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run recovery in Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recoverStaleEpisodes } = await import('@/lib/services/recovery');
    await recoverStaleEpisodes();
  }
}
