'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { UploadForm } from '@/components/episodes/upload-form';
import { FeedForm } from '@/components/episodes/feed-form';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MODES = [
  { id: 'upload' as const, label: '📎 上傳音檔' },
  { id: 'rss' as const, label: '🔗 RSS / Apple' },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'upload' | 'rss'>('upload');

  const handleUploadSuccess = (_episodeId: string) => {
    toast({
      title: '上傳成功！',
      description: '音檔已上傳，正在背景處理中，請在 Dashboard 查看進度。',
    });
    router.push('/');
  };

  const handleFeedSuccess = (episodeIds: string[]) => {
    toast({
      title: `已建立 ${episodeIds.length} 集任務`,
      description: '集數已加入處理佇列，請在歷史記錄查看進度。',
    });
    router.push('/history');
  };

  return (
    <>
      {/* sticky page header (mobile only — desktop uses sidebar) */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/92 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <Link
            href="/"
            className="inline-flex items-center text-[13px] font-medium text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            取消
          </Link>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            新增任務
          </div>
          <span className="w-12" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6 md:px-10 md:py-12">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            新增任務
          </div>
          <h1 className="mt-1 text-balance text-[24px] font-bold leading-[1.15] tracking-tight md:text-[36px]">
            {mode === 'upload' ? (
              <>把音檔變成可搜尋的<br className="md:hidden" />財經摘要</>
            ) : (
              <>從 RSS / Apple Podcasts<br className="md:hidden" />批次彙整集數</>
            )}
          </h1>
        </div>

        <div className="mt-6 inline-flex w-full gap-1 rounded-xl border border-border bg-card p-1 md:w-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition md:flex-none',
                mode === m.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {mode === 'upload' ? (
            <UploadForm onSuccess={handleUploadSuccess} />
          ) : (
            <FeedForm onSuccess={handleFeedSuccess} />
          )}
        </div>
      </div>
    </>
  );
}
