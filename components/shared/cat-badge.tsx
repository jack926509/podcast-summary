import { cn } from '@/lib/utils';

const CATEGORY_CLS: Record<string, string> = {
  市場觀點: 'bg-primary/10 text-primary',
  投資策略: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  數據: 'bg-warning/14 text-warning',
  趨勢: 'bg-success/10 text-success',
  風險提示: 'bg-destructive/12 text-destructive',
  概念解析: 'bg-yellow-500/12 text-yellow-700 dark:text-yellow-400',
  產業動態: 'bg-success/10 text-success',
  操作建議: 'bg-pink-500/12 text-pink-600 dark:text-pink-400',
};

export function CatBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const cls = CATEGORY_CLS[category] ?? 'bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        cls,
        className,
      )}
    >
      {category}
    </span>
  );
}
