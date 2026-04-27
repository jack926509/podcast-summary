// components/podcast/cat-badge.tsx
import { cn } from "@/lib/utils";
import type { KeyPointCategory } from "@/lib/mock-data";

const MAP: Record<KeyPointCategory, { cls: string; label: string }> = {
  market: { cls: "bg-primary/10 text-primary",                  label: "市場觀點" },
  data:   { cls: "bg-warning/14 text-[#a16505]",                label: "數據" },
  risk:   { cls: "bg-destructive/12 text-destructive",          label: "風險提示" },
  strat:  { cls: "bg-violet-500/12 text-violet-600",            label: "策略" },
};

export function CatBadge({ category }: { category: KeyPointCategory }) {
  const m = MAP[category];
  return (
    <span className={cn("inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.1em]", m.cls)}>
      {m.label}
    </span>
  );
}
