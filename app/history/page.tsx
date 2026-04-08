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
      <Suspense>
        <EpisodeTable />
      </Suspense>
    </div>
  );
}
