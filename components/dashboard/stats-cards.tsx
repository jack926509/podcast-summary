import type { DashboardStats } from '@/lib/types';

interface StatsHeroProps {
  stats: DashboardStats;
}

export function StatsHero({ stats }: StatsHeroProps) {
  const { byStatus } = stats;
  const totalDist =
    byStatus.done + byStatus.transcribing + byStatus.summarizing + byStatus.error;
  const seg = (n: number) =>
    totalDist === 0 ? '0%' : `${((n / totalDist) * 100).toFixed(1)}%`;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
        本月新增
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-[44px] font-bold leading-none tracking-tight tabular-nums">
          {stats.monthAdded}
        </div>
        <div className="pb-1 text-[13px] text-muted-foreground">集</div>
      </div>
      <div
        className={
          stats.monthDelta >= 0
            ? 'mt-2 text-[12px] font-medium text-success'
            : 'mt-2 text-[12px] font-medium text-destructive'
        }
      >
        {stats.monthDelta >= 0 ? '↑' : '↓'} 比上月{' '}
        {stats.monthDelta >= 0 ? '+' : ''}
        {stats.monthDelta} 集
      </div>

      <div className="mt-5 space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>處理狀態分佈</span>
          <span className="font-mono font-semibold text-foreground">
            {totalDist}
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <i style={{ width: seg(byStatus.done) }} className="block h-full bg-success" />
          <i
            style={{ width: seg(byStatus.transcribing) }}
            className="block h-full bg-info"
          />
          <i
            style={{ width: seg(byStatus.summarizing) }}
            className="block h-full bg-violet-500"
          />
          <i
            style={{ width: seg(byStatus.error) }}
            className="block h-full bg-destructive"
          />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="text-success">● 完成 {byStatus.done}</span>
          <span className="text-info">● 轉錄 {byStatus.transcribing}</span>
          <span className="text-violet-600 dark:text-violet-400">
            ● 摘要 {byStatus.summarizing}
          </span>
          <span className="text-destructive">● 錯誤 {byStatus.error}</span>
        </div>
      </div>
    </section>
  );
}
