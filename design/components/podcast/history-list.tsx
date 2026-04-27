// components/podcast/history-list.tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EPISODES, STATS } from "@/lib/mock-data";
import { EpisodeCard } from "./episode-card";

const SEGS = [
  { id: "all",         label: "全部",   countKey: null },
  { id: "done",        label: "完成",   countKey: "done" as const },
  { id: "summarizing", label: "處理中", countKey: null },
  { id: "error",       label: "錯誤",   countKey: "error" as const },
];

export function HistoryList() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = EPISODES.filter((ep) => {
    if (filter === "summarizing") {
      if (ep.status !== "summarizing" && ep.status !== "transcribing") return false;
    } else if (filter !== "all" && ep.status !== filter) return false;
    if (q && !ep.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/92 backdrop-blur md:top-0">
        <div className="mx-auto max-w-6xl px-5 py-3 md:px-10 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[22px] font-bold tracking-tight md:text-[28px]">
              歷史記錄{" "}
              <span className="ml-1 font-mono text-[14px] font-medium text-muted-foreground md:text-[16px]">
                {STATS.total}
              </span>
            </h1>
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" size="sm">↑↓ 排序</Button>
              <Button size="sm">+ 新增</Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:max-w-md md:flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜尋標題、摘要、tickers…"
                className="h-10 pl-9"
              />
            </div>
            <div className="inline-flex divide-x divide-border overflow-hidden rounded-lg border border-border bg-card text-[12px] md:ml-auto">
              {SEGS.map((s) => {
                const count =
                  s.id === "all" ? STATS.total :
                  s.id === "summarizing" ? STATS.byStatus.summarizing + STATS.byStatus.transcribing :
                  s.countKey ? STATS.byStatus[s.countKey] : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setFilter(s.id)}
                    className={cn(
                      "px-3 py-2 font-medium",
                      filter === s.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s.label} <span className="font-mono opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-2.5 px-5 py-4 md:px-10 md:py-6">
        {filtered.map((ep) => <EpisodeCard key={ep.id} ep={ep} />)}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-muted-foreground">
            沒有符合條件的集數。試試清除篩選 ↺
          </div>
        )}
      </div>
    </>
  );
}
