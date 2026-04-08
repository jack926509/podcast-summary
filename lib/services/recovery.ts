import { prisma } from '@/lib/prisma';
import { EPISODE_STATUS } from '@/lib/constants';
import { processEpisode } from './pipeline';

/**
 * On server startup, find any episodes that were left in a processing state
 * (e.g. due to a server crash) and re-queue them for processing.
 *
 * Episodes in 'transcribing' or 'summarizing' states indicate an interrupted
 * pipeline run. We reset them to 'pending' and restart processing.
 */
export async function recoverStaleEpisodes(): Promise<void> {
  try {
    const stale = await prisma.episode.findMany({
      where: {
        status: { in: [EPISODE_STATUS.TRANSCRIBING, EPISODE_STATUS.SUMMARIZING] },
      },
      select: { id: true, status: true },
    });

    if (stale.length === 0) return;

    console.log(`[recovery] Found ${stale.length} stale episode(s), re-queuing...`);

    // Reset all stale episodes to pending
    await prisma.episode.updateMany({
      where: { id: { in: stale.map((e) => e.id) } },
      data: { status: EPISODE_STATUS.PENDING, errorMsg: null },
    });

    // Re-trigger pipeline for each (staggered to avoid rate limits)
    stale.forEach((episode, i) => {
      setTimeout(() => {
        processEpisode(episode.id).catch((err) =>
          console.error(`[recovery] Pipeline error for episode ${episode.id}:`, err),
        );
      }, i * 500);
    });

    console.log(`[recovery] Re-queued ${stale.length} episode(s).`);
  } catch (err) {
    console.error('[recovery] Failed to recover stale episodes:', err);
  }
}
