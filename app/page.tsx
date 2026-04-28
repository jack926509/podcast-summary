import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { StatsHero } from '@/components/dashboard/stats-cards';
import { RecentTasks } from '@/components/dashboard/recent-tasks';
import { UsageCard, type UsageData } from '@/components/dashboard/usage-card';
import { Button } from '@/components/ui/button';
import { EPISODE_STATUS } from '@/lib/constants';
import type { DashboardStats, EpisodeWithRelations } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [counts, total, monthAdded, lastMonthAdded, bullCount7d] = await Promise.all([
    prisma.episode.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.episode.count(),
    prisma.episode.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.episode.count({
      where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
    }),
    prisma.summary.count({
      where: { sentiment: '看多', createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const map = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status]),
  ) as Record<string, number>;

  return {
    total,
    monthAdded,
    monthDelta: monthAdded - lastMonthAdded,
    bullCount7d,
    byStatus: {
      done: map[EPISODE_STATUS.DONE] ?? 0,
      transcribing:
        (map[EPISODE_STATUS.PENDING] ?? 0) +
        (map[EPISODE_STATUS.TRANSCRIBING] ?? 0),
      summarizing: map[EPISODE_STATUS.SUMMARIZING] ?? 0,
      error: map[EPISODE_STATUS.ERROR] ?? 0,
    },
  };
}

async function getRecentEpisodes(): Promise<EpisodeWithRelations[]> {
  const episodes = await prisma.episode.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { podcast: true, summary: true },
  });
  return episodes as EpisodeWithRelations[];
}

async function getUsage(): Promise<UsageData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthEpisodes = await prisma.episode.findMany({
    where: {
      status: 'done',
      createdAt: { gte: monthStart },
      costUsd: { not: null },
    },
    select: {
      summaryMode: true,
      costUsd: true,
      transcribeMinutes: true,
      podcast: { select: { id: true, title: true } },
    },
  });

  const totalCount = monthEpisodes.length;
  const totalCost = monthEpisodes.reduce((s, e) => s + (e.costUsd ?? 0), 0);
  const totalMinutes = monthEpisodes.reduce((s, e) => s + (e.transcribeMinutes ?? 0), 0);
  const avgCost = totalCount > 0 ? totalCost / totalCount : 0;

  const modeAgg = new Map<string, { count: number; cost: number }>();
  for (const ep of monthEpisodes) {
    const mode = ep.summaryMode || 'standard';
    const slot = modeAgg.get(mode) ?? { count: 0, cost: 0 };
    slot.count += 1;
    slot.cost += ep.costUsd ?? 0;
    modeAgg.set(mode, slot);
  }
  const byMode = Array.from(modeAgg.entries())
    .map(([mode, v]) => ({ mode, ...v }))
    .sort((a, b) => b.cost - a.cost);

  const podcastAgg = new Map<string, { id: string; title: string; count: number; cost: number }>();
  for (const ep of monthEpisodes) {
    const slot = podcastAgg.get(ep.podcast.id) ?? {
      id: ep.podcast.id,
      title: ep.podcast.title,
      count: 0,
      cost: 0,
    };
    slot.count += 1;
    slot.cost += ep.costUsd ?? 0;
    podcastAgg.set(ep.podcast.id, slot);
  }
  const topPodcasts = Array.from(podcastAgg.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return { totalCount, totalCost, totalMinutes, avgCost, byMode, topPodcasts };
}

export default async function DashboardPage() {
  const [stats, recentEpisodes, usage] = await Promise.all([
    getStats(),
    getRecentEpisodes(),
    getUsage(),
  ]);

  const processing = stats.byStatus.transcribing + stats.byStatus.summarizing;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-10 md:pt-10">
      {/* Page hero */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[.18em] text-muted-foreground">
            Dashboard
          </div>
          <h1 className="mt-1 text-balance text-[26px] font-bold leading-[1.15] tracking-tight md:text-[34px]">
            <span className="font-mono tabular-nums text-primary">{stats.total}</span>{' '}
            集已歸檔
            {processing > 0 && (
              <>
                ，
                <span className="font-mono tabular-nums text-violet-600 dark:text-violet-400">
                  {processing}
                </span>{' '}
                集處理中
              </>
            )}
          </h1>
          <p className="mt-2 max-w-prose text-[13.5px] text-muted-foreground">
            本月新增 {stats.monthAdded} 集
            {stats.monthDelta !== 0 && (
              <>，比上月 {stats.monthDelta > 0 ? '+' : ''}{stats.monthDelta}</>
            )}
            {stats.bullCount7d > 0 && (
              <>。最近 7 天 {stats.bullCount7d} 集標記為「看多」。</>
            )}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" asChild>
            <Link href="/history">
              <Search className="h-4 w-4" />
              搜尋集數
            </Link>
          </Button>
          <Button asChild>
            <Link href="/new">
              <Plus className="h-4 w-4" />
              新增任務
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat hero + activity */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatsHero stats={stats} />
        <RecentTasks episodes={recentEpisodes} />
      </div>

      {/* Usage panel */}
      <div className="mt-4">
        <UsageCard data={usage} />
      </div>
    </div>
  );
}
