import { Suspense } from 'react';
import { EpisodeTable } from '@/components/episodes/episode-table';

export const dynamic = 'force-dynamic';

function HistorySkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-3 px-5 py-4 md:px-10 md:py-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[110px] animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <EpisodeTable />
    </Suspense>
  );
}
