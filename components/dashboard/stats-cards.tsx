import { Mic, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EpisodeStats } from '@/lib/types';

interface StatsCardsProps {
  stats: EpisodeStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '總集數',
      value: stats.total,
      icon: Mic,
      description: '所有已建立的集數',
      color: 'text-primary',
    },
    {
      title: '處理中',
      value: stats.processing,
      icon: Loader2,
      description: '等待 / 轉錄 / 摘要中',
      color: 'text-warning',
      spin: true,
    },
    {
      title: '已完成',
      value: stats.done,
      icon: CheckCircle2,
      description: '成功產生摘要',
      color: 'text-success',
    },
    {
      title: '錯誤',
      value: stats.error,
      icon: XCircle,
      description: '處理失敗的集數',
      color: 'text-destructive',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, value, icon: Icon, description, color, spin }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon
              className={`h-4 w-4 ${color} ${spin ? 'animate-spin' : ''}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
