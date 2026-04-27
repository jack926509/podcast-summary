import { cn } from '@/lib/utils';
import { EPISODE_STATUS, type EpisodeStatus } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  EpisodeStatus,
  { label: string; cls: string; dot?: boolean }
> = {
  [EPISODE_STATUS.PENDING]: {
    label: '等待中',
    cls: 'bg-secondary text-secondary-foreground',
    dot: true,
  },
  [EPISODE_STATUS.TRANSCRIBING]: {
    label: '轉錄中',
    cls: 'bg-info/12 text-info',
    dot: true,
  },
  [EPISODE_STATUS.SUMMARIZING]: {
    label: '摘要中',
    cls: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    dot: true,
  },
  [EPISODE_STATUS.DONE]: {
    label: '完成',
    cls: 'bg-success/12 text-success',
  },
  [EPISODE_STATUS.ERROR]: {
    label: '錯誤',
    cls: 'bg-destructive/12 text-destructive',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg =
    STATUS_CONFIG[status as EpisodeStatus] ??
    STATUS_CONFIG[EPISODE_STATUS.PENDING];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap',
        cfg.cls,
        className,
      )}
    >
      {cfg.dot && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {cfg.label}
    </span>
  );
}
