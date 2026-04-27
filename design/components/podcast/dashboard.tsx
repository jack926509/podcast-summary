// components/podcast/dashboard.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { STATS, EPISODES } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";

export function Dashboard() {
  const total = Object.values(STATS.byStatus).reduce((a, b) => a + b, 0);
  const seg = (key: keyof typeof STATS.byStatus) =>
    `${((STATS.byStatus[key] / total) * 100).toFixed(1)}%`;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-10 md:pt-10">
      {/* Page hero */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[.18em] text-muted-foreground">Dashboard</div>
          <h1 className="mt-1 text-balance text-[26px] font-bold leading-[1.15] tracking-tight md:text-[34px]">
            <span className="font-mono tabular-nums text-primary">{STATS.total}</span> 集已歸檔，
            <span className="font-mono tabular-nums text-violet-600">
              {STATS.byStatus.summarizing + STATS.byStatus.transcribing}
            </span>{" "}
            集處理中
          </h1>
          <p className="mt-2 max-w-prose text-[13.5px] text-muted-foreground">
            本月新增 {STATS.monthAdded} 集，比上月 +{STATS.monthDelta}。最近 7 天 4 集標記為「看多」。
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline">⌕ 搜尋集數</Button>
          <Button asChild><Link href="/new">+ 新增任務</Link></Button>
        </div>
      </div>

      {/* Stat hero + activity */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {/* hero stat */}
        <section className="rounded-2xl border border-border bg-card p-5 md:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">本月新增</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{STATS.monthAdded}</div>
            <div className="pb-1 text-[13px] text-muted-foreground">集</div>
          </div>
          <div className="mt-2 text-[12px] font-medium text-success">↑ 比上月 +{STATS.monthDelta} 集</div>
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>處理狀態分佈</span>
              <span className="font-mono font-semibold text-foreground">{total}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <i style={{ width: seg("done") }}         className="block h-full bg-success" />
              <i style={{ width: seg("transcribing") }} className="block h-full bg-info" />
              <i style={{ width: seg("summarizing") }}  className="block h-full bg-violet-500" />
              <i style={{ width: seg("error") }}        className="block h-full bg-destructive" />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="text-success">● 完成 {STATS.byStatus.done}</span>
              <span className="text-info">● 轉錄 {STATS.byStatus.transcribing}</span>
              <span className="text-violet-600">● 摘要 {STATS.byStatus.summarizing}</span>
              <span className="text-destructive">● 錯誤 {STATS.byStatus.error}</span>
            </div>
          </div>
        </section>

        {/* recent activity */}
        <section className="rounded-2xl border border-border bg-card md:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-tight">最近活動</h3>
            <Link href="/history" className="text-[12px] text-muted-foreground hover:text-primary">歷史 ›</Link>
          </div>
          <ul>
            {EPISODES.slice(0, 4).map((ep) => (
              <li key={ep.id} className="border-b border-border last:border-0">
                <Link
                  href={`/episodes/${ep.id}`}
                  className="grid cursor-pointer grid-cols-[60px_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-muted/40 md:gap-5"
                >
                  <div className="text-right font-mono text-[10px] leading-tight text-muted-foreground">
                    <div className="text-[13px] font-semibold tracking-tight text-foreground">
                      {ep.publishedAt.slice(5)}
                    </div>
                    <div>{ep.duration}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium md:text-[14px]">{ep.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{ep.show}</span>
                      {ep.sentiment === "bull" && <span className="rounded bg-success/12 px-1.5 py-0.5 font-medium text-success">看多</span>}
                      {ep.sentiment === "bear" && <span className="rounded bg-destructive/12 px-1.5 py-0.5 font-medium text-destructive">看空</span>}
                    </div>
                  </div>
                  <StatusPill status={ep.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
