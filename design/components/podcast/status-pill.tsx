// components/podcast/status-pill.tsx
import { cn } from "@/lib/utils";
import type { EpisodeStatus } from "@/lib/mock-data";

const MAP: Record<EpisodeStatus, { cls: string; label: string; dot?: boolean }> = {
  done:         { cls: "bg-success/12 text-success",                 label: "完成" },
  transcribing: { cls: "bg-info/12 text-info",                       label: "轉錄中", dot: true },
  summarizing:  { cls: "bg-violet-500/12 text-violet-600",           label: "摘要中", dot: true },
  error:        { cls: "bg-destructive/12 text-destructive",         label: "錯誤" },
};

export function StatusPill({ status }: { status: EpisodeStatus }) {
  const s = MAP[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", s.cls)}>
      {s.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {s.label}
    </span>
  );
}
