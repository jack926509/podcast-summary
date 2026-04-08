import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentTasks } from '@/components/dashboard/recent-tasks';
import { Button } from '@/components/ui/button';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import type { EpisodeStats, EpisodeWithPodcast } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStats(): Promise<EpisodeStats> {
  const counts = await prisma.episode.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const countMap = Object.fromEntries(
    counts.map((c: { status: string; _count: { status: number } }) => [c.status, c._count.status]),
  );

  const processing = PROCESSING_STATUSES.reduce(
    (sum, s) => sum + (countMap[s] ?? 0),
    0,
  );

  return {
    total: Object.values(countMap).reduce((a, b) => a + b, 0),
    processing,
    done: countMap[EPISODE_STATUS.DONE] ?? 0,
    error: countMap[EPISODE_STATUS.ERROR] ?? 0,
  };
}

async function getRecentEpisodes(): Promise<EpisodeWithPodcast[]> {
  const episodes = await prisma.episode.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { podcast: true },
  });
  return episodes as EpisodeWithPodcast[];
}

export default async function DashboardPage() {
  const [stats, recentEpisodes] = await Promise.all([
    getStats(),
    getRecentEpisodes(),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            歡迎回來！以下是您的 Podcast 摘要概覽。
          </p>
        </div>
        <Button asChild>
          <Link href="/new">
            <PlusCircle className="h-4 w-4" />
            新增任務
          </Link>
        </Button>
      </div>

      <StatsCards stats={stats} />
      <RecentTasks episodes={recentEpisodes} />
    </div>
  );
}
