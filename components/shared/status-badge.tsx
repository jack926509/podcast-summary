import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EPISODE_STATUS, type EpisodeStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  EpisodeStatus,
  { label: string; variant: 'secondary' | 'success' | 'destructive' | 'info' | 'purple' | 'warning'; spinning?: boolean }
> = {
  [EPISODE_STATUS.PENDING]: {
    label: '等待中',
    variant: 'secondary',
  },
  [EPISODE_STATUS.TRANSCRIBING]: {
    label: '轉錄中',
    variant: 'info',
    spinning: true,
  },
  [EPISODE_STATUS.SUMMARIZING]: {
    label: '摘要中',
    variant: 'purple',
    spinning: true,
  },
  [EPISODE_STATUS.DONE]: {
    label: '完成',
    variant: 'success',
  },
  [EPISODE_STATUS.ERROR]: {
    label: '錯誤',
    variant: 'destructive',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as EpisodeStatus] ?? STATUS_CONFIG[EPISODE_STATUS.PENDING];

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {config.spinning && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}
