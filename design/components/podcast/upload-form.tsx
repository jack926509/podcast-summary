// components/podcast/upload-form.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function UploadForm() {
  const [mode, setMode] = useState<"upload" | "rss">("upload");

  return (
    <div className="pb-28 md:pb-12">
      {/* sticky header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3 md:px-10 md:py-4">
          <Link href="/" className="text-[13px] font-medium text-primary hover:underline">‹ 取消</Link>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">新增任務</div>
          <span className="w-12" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6 md:px-10 md:py-12">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">新增任務</div>
          <h1 className="mt-1 text-balance text-[24px] font-bold leading-[1.15] tracking-tight md:text-[36px]">
            把音檔變成可搜尋的<br className="md:hidden" />財經摘要
          </h1>
        </div>

        <div className="mt-6 inline-flex w-full gap-1 rounded-xl border border-border bg-card p-1 md:w-auto">
          {[
            { id: "upload" as const, label: "📎 上傳音檔" },
            { id: "rss" as const,    label: "🔗 RSS / Apple" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition md:flex-none",
                mode === m.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <div className="mt-5 rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-primary/[.04] px-6 py-10 text-center md:py-14">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-2xl text-primary md:h-16 md:w-16">⇪</div>
            <p className="mt-3 text-[15px] font-bold tracking-tight md:mt-4 md:text-[18px]">
              點此選擇音檔
              <span className="hidden md:inline"> 或拖放至此</span>
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground md:text-[13px]">MP3 · WAV · M4A · OGG · 最大 500 MB</p>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:mt-5">或</div>
            <Button variant="outline" className="mt-2">📁 從檔案 App</Button>
          </div>
        ) : (
          <div className="mt-5">
            <Label htmlFor="rss">RSS Feed 網址</Label>
            <Input id="rss" className="mt-1.5" placeholder="https://feeds.example.com/podcast.xml" />
            <div className="mt-2 text-[11.5px] text-muted-foreground">
              支援 Apple Podcasts URL — 系統會自動解析 RSS。
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-bold not-italic text-primary">ⓘ</span>
          <div>音檔超過 25 MB 會自動分段轉錄，整段約需 2–5 分鐘。處理期間可關閉 App，完成後會在 Dashboard 顯示。</div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="title">集數標題（選填）</Label>
            <Input id="title" className="mt-1.5" placeholder="未填寫將使用檔名" />
          </div>
          <div>
            <Label>分類</Label>
            <Select>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="市場觀點" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="market">市場觀點</SelectItem>
                <SelectItem value="macro">總經</SelectItem>
                <SelectItem value="industry">產業觀察</SelectItem>
                <SelectItem value="strategy">投資策略</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8 hidden justify-end gap-3 md:flex">
          <Button variant="outline" asChild><Link href="/">取消</Link></Button>
          <Button>開始處理 →</Button>
        </div>
      </div>

      {/* mobile sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/92 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur md:hidden">
        <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
          <Button variant="outline" className="h-11 flex-1" asChild><Link href="/">取消</Link></Button>
          <Button className="h-11 flex-[2]">開始處理 →</Button>
        </div>
      </div>
    </div>
  );
}
