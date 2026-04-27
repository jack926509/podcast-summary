import Link from 'next/link';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDuration } from '@/lib/utils';
import type { EpisodeWithRelations } from '@/lib/types';

interface RecentTasksProps {
  episodes: EpisodeWithRelations[];
}

function formatMonthDay(date: Date | string | null) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

export function RecentTasks({ episodes }: RecentTasksProps) {
  return (
    <section className="rounded-2xl border border-border bg-card md:col-span-2">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-[15px] font-semibold tracking-tight">最近活動</h3>
        <Link
          href="/history"
          className="text-[12px] text-muted-foreground hover:text-primary"
        >
          全部 ›
        </Link>
      </div>

      {episodes.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-muted-foreground">
          尚無任務。前往「新增任務」開始處理第一集 Podcast。
        </p>
      ) : (
        <ul>
          {episodes.map((ep) => {
            const sentiment = ep.summary?.sentiment ?? null;
            const dateLabel = formatMonthDay(ep.publishedAt ?? ep.createdAt);
            const durationLabel = formatDuration(ep.duration);
            return (
              <li key={ep.id} className="border-b border-border last:border-0">
                <Link
                  href={`/history/${ep.id}`}
                  className="grid cursor-pointer grid-cols-[60px_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-muted/40 md:gap-5"
                >
                  <div className="text-right font-mono text-[10px] leading-tight text-muted-foreground">
                    <div className="text-[13px] font-semibold tracking-tight text-foreground">
                      {dateLabel}
                    </div>
                    <div>{durationLabel}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium md:text-[14px]">
                      {ep.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{ep.podcast?.title ?? '—'}</span>
                      {sentiment === '看多' && (
                        <span className="rounded bg-success/12 px-1.5 py-0.5 font-medium text-success">
                          看多
                        </span>
                      )}
                      {sentiment === '看空' && (
                        <span className="rounded bg-destructive/12 px-1.5 py-0.5 font-medium text-destructive">
                          看空
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={ep.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
