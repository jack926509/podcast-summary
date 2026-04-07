'use client';

import { useState, useEffect, useRef } from 'react';
import { PROCESSING_STATUSES, POLLING_INTERVAL_MS } from '@/lib/constants';
import type { EpisodeWithRelations } from '@/lib/types';

export function useEpisodePolling(initialEpisode: EpisodeWithRelations) {
  const [episode, setEpisode] = useState<EpisodeWithRelations>(initialEpisode);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shouldPoll = PROCESSING_STATUSES.includes(
    episode.status as (typeof PROCESSING_STATUSES)[number],
  );

  useEffect(() => {
    if (!shouldPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/episodes/${episode.id}`);
        if (!res.ok) return;
        const updated: EpisodeWithRelations = await res.json();
        setEpisode(updated);

        if (
          !PROCESSING_STATUSES.includes(
            updated.status as (typeof PROCESSING_STATUSES)[number],
          )
        ) {
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Silently ignore network errors during polling
      }
    };

    intervalRef.current = setInterval(poll, POLLING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id, shouldPoll]);

  return { episode, isPolling };
}
