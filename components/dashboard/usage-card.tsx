import { formatUsd } from '@/lib/pricing';

const MODE_LABEL: Record<string, string> = {
  brief: '快速',
  standard: '標準',
  deep: '深度',
};

export interface UsageData {
  totalCount: number;
  totalCost: number;
  totalMinutes: number;
  avgCost: number;
  byMode: { mode: string; count: number; cost: number }[];
  topPodcasts: { id: string; title: string; count: number; cost: number }[];
}

export function UsageCard({ data }: { data: UsageData }) {
  const monthLabel = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  if (data.totalCount === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="font-mono text-[11px] uppercase tracking-[.18em] text-muted-foreground">
          {monthLabel} 用量
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          本月還沒有完成集數的成本紀錄，處理幾集後這裡會顯示花費明細。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[.18em] text-muted-foreground">
          {monthLabel} 用量
        </div>
        <div className="text-[11px] text-muted-foreground">
          {Math.round(data.totalMinutes)} 分鐘音檔
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <div className="font-mono text-[28px] font-bold tabular-nums tracking-tight">
          {formatUsd(data.totalCost)}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {data.totalCount} 集 · 平均 {formatUsd(data.avgCost)}/集
        </div>
      </div>

      {data.byMode.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">模式分布</div>
          <div className="flex flex-wrap gap-1.5">
            {data.byMode.map((m) => (
              <span
                key={m.mode}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11.5px]"
              >
                <span className="font-medium">{MODE_LABEL[m.mode] ?? m.mode}</span>
                <span className="text-muted-foreground">{m.count} 集</span>
                <span className="font-mono tabular-nums text-foreground/80">
                  {formatUsd(m.cost)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.topPodcasts.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">最燒 podcast</div>
          <ul className="space-y-1">
            {data.topPodcasts.slice(0, 3).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate text-foreground/85">{p.title}</span>
                <span className="flex-shrink-0 font-mono tabular-nums text-muted-foreground">
                  {p.count} · {formatUsd(p.cost)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
