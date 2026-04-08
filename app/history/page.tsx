import { Suspense } from 'react';
import { EpisodeTable } from '@/components/episodes/episode-table';

export default function HistoryPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">歷史記錄</h1>
        <p className="text-sm text-muted-foreground mt-1">
          所有已處理或處理中的 Podcast 集數。
        </p>
      </div>
      <Suspense fallback={
        <div className="space-y-4">
          <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
          <div className="rounded-md border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse hidden md:block" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      }>
        <EpisodeTable />
      </Suspense>
    </div>
  );
}
