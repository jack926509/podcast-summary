// components/podcast/episode-detail.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KEYPOINTS, KEYPOINT_TABS, WATCHLIST, type Episode } from "@/lib/mock-data";
import { CatBadge } from "./cat-badge";
import { RichText } from "./rich-text";

export function EpisodeDetail({ ep }: { ep: Episode }) {
  const [tab, setTab] = useState<string>("keypts");

  return (
    <div className="pb-28 md:pb-12">
      {/* sticky nav row */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/92 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 md:px-10 md:py-4">
          <Link href="/history" className="text-[13px] font-medium text-primary hover:underline">‹ 歷史</Link>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label="搜尋">⌕</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label="收藏">♡</button>
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label="更多">⋯</button>
          </div>
        </div>
      </div>

      {/* lede card */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 py-5 md:px-10 md:py-8">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[.16em] text-muted-foreground">
            <span className="text-primary">{ep.category}</span>
            <span>· EP.{ep.id}</span>
            {ep.sentiment === "bull" && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-success">↑ 看多</span>
            )}
            {ep.sentiment === "bear" && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-destructive">↓ 看空</span>
            )}
          </div>
          <h1 className="mt-3 text-balance text-[22px] font-bold leading-[1.2] tracking-tight md:text-[34px]">{ep.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
            <b className="font-medium text-foreground">{ep.show}</b>
            <span>· {ep.publishedAt} · {ep.duration}</span>
            {ep.tickers.length > 0 && <span>· {ep.tickers.length} 標的 · {ep.bullCount} 看多 {ep.bearCount} 看空</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto md:grid md:max-w-5xl md:grid-cols-[1fr_240px] md:gap-10 md:px-10 md:pt-8">
        <div className="min-w-0">
          {/* tab strip */}
          <div className="sticky top-[56px] z-10 -mx-5 border-b border-border bg-card/92 backdrop-blur md:top-0 md:mx-0 md:rounded-t-xl">
            <div className="flex overflow-x-auto px-5 [scrollbar-width:none] md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {KEYPOINT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-medium transition md:text-[13px]",
                    tab === t.id ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {t.count != null && (
                    <span className={cn("ml-1 font-mono text-[10px]", tab === t.id ? "text-primary" : "text-muted-foreground")}>
                      {t.count}
                    </span>
                  )}
                  {tab === t.id && <span className="absolute inset-x-3.5 bottom-0 h-0.5 rounded bg-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* tab body */}
          <div className="px-5 py-6 md:px-0">
            {tab === "keypts" && (
              <ol className="space-y-6">
                {KEYPOINTS.map((k) => (
                  <li key={k.n} className="grid grid-cols-[40px_1fr] gap-3 md:grid-cols-[60px_1fr] md:gap-5">
                    <div className="text-right font-mono text-[10px] text-muted-foreground">
                      <div className="text-[15px] font-semibold tracking-tight text-primary md:text-[18px]">
                        {String(k.n).padStart(2, "0")}
                      </div>
                    </div>
                    <div>
                      <CatBadge category={k.category} />
                      <p className="mt-1.5 text-pretty text-[13.5px] leading-[1.7] text-foreground/85 md:text-[15px]">
                        <RichText text={k.body} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {tab === "sum" && (
              <article className="prose prose-sm max-w-none md:prose-base">
                <p className="text-[14px] leading-[1.85] text-foreground/85 md:text-[16px] [&::first-letter]:float-left [&::first-letter]:pr-1 [&::first-letter]:text-[2.4em] [&::first-letter]:font-bold [&::first-letter]:leading-none [&::first-letter]:text-primary">
                  本集聚焦下週財報週開盤前的市場觀察。主持人首先回顧本週半導體類股的修正幅度，並將其歸因於 AI 資本支出疑慮以及對中國晶片管制升級的預期。在這個背景下，NVDA 的法說會將是下週最重要的市場事件。
                </p>
                <p className="text-[14px] leading-[1.85] text-foreground/85 md:text-[16px]">
                  主持人提醒聽眾留意「預期管理」效應 — 過去四個季度，NVDA 雖然 EPS 都優於預期，但盤後反應卻出現 beat-and-fall。原因在於市場已將高成長 price-in，任何 guidance 不及預期都會引發獲利了結。
                </p>
              </article>
            )}

            {tab === "wl" && (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-[13px]">
                  <thead className="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">標的</th>
                      <th className="px-4 py-2 text-left font-medium">立場</th>
                      <th className="hidden px-4 py-2 text-left font-medium md:table-cell">目標價</th>
                      <th className="px-4 py-2 text-left font-medium">備註</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {WATCHLIST.map((w) => (
                      <tr key={w.symbol}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold">{w.symbol}</span>
                          <span className="ml-2 hidden text-[11.5px] text-muted-foreground md:inline">{w.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {w.view === "bull" ? <span className="font-medium text-success">▲ 看多</span> :
                           w.view === "bear" ? <span className="font-medium text-destructive">▼ 看空</span> :
                           <span className="text-muted-foreground">— 中性</span>}
                        </td>
                        <td className="hidden px-4 py-3 font-mono md:table-cell">{w.target}</td>
                        <td className="px-4 py-3 text-muted-foreground">{w.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(tab === "act" || tab === "qa" || tab === "quote" || tab === "tx") && (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-[13px] text-muted-foreground">
                <div className="font-mono text-[11px] uppercase tracking-widest">
                  {KEYPOINT_TABS.find((t) => t.id === tab)?.label}
                </div>
                <div className="mt-2">此分頁內容（同樣的渲染邏輯）</div>
              </div>
            )}
          </div>
        </div>

        {/* desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-4 pt-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">市場立場</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl text-success">↑</span>
                <span className="text-[16px] font-semibold text-success">看多</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                主持人對半導體類股短線給出 buy-the-dip 訊號，但點出 NVDA 法說可能引發系統性風險。
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                <span>Watchlist</span>
                <span>{WATCHLIST.length}</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {WATCHLIST.map((w) => (
                  <li key={w.symbol} className="flex items-center justify-between text-[12.5px]">
                    <span className="font-mono font-semibold">{w.symbol}</span>
                    {w.view === "bull" ? <span className="text-success">▲</span> :
                     w.view === "bear" ? <span className="text-destructive">▼</span> :
                     <span className="text-muted-foreground">—</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">目錄</div>
              <ul className="mt-2 space-y-1 text-[12.5px]">
                {KEYPOINT_TABS.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1",
                        tab === t.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.label}
                      {t.count != null && <span className="font-mono text-[10px] opacity-70">{t.count}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/92 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur md:hidden">
        <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
          <Button variant="outline" className="h-11 flex-1 text-[13px] font-semibold">⎘ 複製全文</Button>
          <Button className="h-11 flex-1 text-[13px] font-semibold">↓ 匯出 MD</Button>
        </div>
      </div>

      {/* desktop floating action */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:block">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur">
          <Button variant="ghost" size="sm" className="rounded-full">⎘ 複製</Button>
          <Button size="sm" className="rounded-full">↓ 匯出 MD</Button>
        </div>
      </div>
    </div>
  );
}
