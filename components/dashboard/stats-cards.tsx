import { Headphones, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { EpisodeStats } from '@/lib/types';

interface StatsCardsProps {
  stats: EpisodeStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '總集數',
      value: stats.total,
      icon: Headphones,
      description: '所有已建立的集數',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: '處理中',
      value: stats.processing,
      icon: Loader2,
      description: '等待 / 轉錄 / 摘要中',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      spin: true,
    },
    {
      title: '已完成',
      value: stats.done,
      icon: CheckCircle2,
      description: '成功產生摘要',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: '錯誤',
      value: stats.error,
      icon: XCircle,
      description: '處理失敗的集數',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, value, icon: Icon, description, iconBg, iconColor, spin }) => (
        <div
          key={title}
          className="rounded-xl border bg-card px-5 py-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor} ${spin ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
