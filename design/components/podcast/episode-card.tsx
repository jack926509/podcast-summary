// components/podcast/episode-card.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Episode } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";

const RAIL: Record<Episode["sentiment"], string> = {
  bull: "bg-success",
  bear: "bg-destructive",
  neu:  "bg-border",
};

export function EpisodeCard({ ep }: { ep: Episode }) {
  return (
    <Link
      href={`/episodes/${ep.id}`}
      className="group grid grid-cols-[3px_1fr] overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className={cn(RAIL[ep.sentiment])} />
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-pretty text-[14.5px] md:text-[15.5px] font-semibold leading-snug tracking-tight">
              {ep.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
              <b className="font-medium text-foreground">{ep.show}</b>
              <span>·</span>
              <span>{ep.duration}</span>
              <span>·</span>
              <span className="font-mono">{ep.publishedAt.slice(5)}</span>
            </div>
          </div>
          <StatusPill status={ep.status} />
        </div>

        {ep.status === "summarizing" || ep.status === "transcribing" ? (
          <div className="mt-2.5 text-[12px] italic text-muted-foreground">{ep.excerpt}</div>
        ) : ep.status === "error" ? (
          <div className="mt-2.5 text-[12px] text-destructive">{ep.excerpt}</div>
        ) : (
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-foreground/75">
            {ep.excerpt}
          </p>
        )}

        {ep.status === "done" && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="inline-flex shrink-0 items-center rounded-full border border-transparent bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                {ep.category}
              </span>
              {ep.tags.slice(0, 3).map((t) => (
                <span key={t} className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10.5px] font-medium text-foreground/65">
                  {t}
                </span>
              ))}
            </div>
            {ep.tickers.length > 0 && (
              <div className="hidden shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
                <span>標的 {ep.tickers.length}</span>
                {ep.bullCount > 0 && <b className="font-bold text-success">▲{ep.bullCount}</b>}
                {ep.bearCount > 0 && <b className="font-bold text-destructive">▼{ep.bearCount}</b>}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
