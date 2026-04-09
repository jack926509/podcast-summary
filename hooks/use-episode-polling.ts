'use client';

import { useState, useEffect, useRef } from 'react';
import { PROCESSING_STATUSES } from '@/lib/constants';
import type { EpisodeWithRelations } from '@/lib/types';

/**
 * Exponential backoff polling intervals for long-running episode processing.
 * Financial podcasts can take 5-15 minutes — polling every 3s wastes resources.
 *
 * Schedule:
 *   0 – 60 s  → every 5 s
 *   1 – 5 min → every 15 s
 *   5 min+    → every 30 s
 */
function getPollingInterval(elapsedMs: number): number {
  if (elapsedMs < 60_000) return 5_000;
  if (elapsedMs < 300_000) return 15_000;
  return 30_000;
}

export function useEpisodePolling(initialEpisode: EpisodeWithRelations) {
  const [episode, setEpisode] = useState<EpisodeWithRelations>(initialEpisode);
  const [isPolling, setIsPolling] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldPoll = PROCESSING_STATUSES.includes(
    episode.status as (typeof PROCESSING_STATUSES)[number],
  );

  useEffect(() => {
    if (!shouldPoll) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      startedAtRef.current = null;
      setIsPolling(false);
      return;
    }

    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    setIsPolling(true);

    const schedulePoll = () => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const interval = getPollingInterval(elapsed);

      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/episodes/${episode.id}`);
          if (!res.ok) return;
          const updated: EpisodeWithRelations = await res.json();
          setEpisode(updated);

          if (!PROCESSING_STATUSES.includes(updated.status as (typeof PROCESSING_STATUSES)[number])) {
            setIsPolling(false);
            startedAtRef.current = null;
            return;
          }
        } catch {
          // Silently ignore network errors during polling
        }
        schedulePoll(); // schedule next tick
      }, interval);
    };

    schedulePoll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // episode.id and shouldPoll are the only values that should restart polling.
  }, [episode.id, shouldPoll]); // eslint-disable-line react-hooks/exhaustive-deps

  return { episode, isPolling };
}
