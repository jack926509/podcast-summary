import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/usage
 * 回傳本月用量看板資料：成本總計 / 模式分布 / 最燒 podcast。
 */
export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthEpisodes = await prisma.episode.findMany({
      where: {
        status: 'done',
        createdAt: { gte: monthStart },
        costUsd: { not: null },
      },
      select: {
        id: true,
        summaryMode: true,
        costUsd: true,
        transcribeMinutes: true,
        inputTokens: true,
        outputTokens: true,
        podcast: { select: { id: true, title: true } },
      },
    });

    const totalCount = monthEpisodes.length;
    const totalCost = monthEpisodes.reduce((sum, e) => sum + (e.costUsd ?? 0), 0);
    const totalMinutes = monthEpisodes.reduce((sum, e) => sum + (e.transcribeMinutes ?? 0), 0);
    const avgCost = totalCount > 0 ? totalCost / totalCount : 0;

    // Mode breakdown
    const modeAgg = new Map<string, { count: number; cost: number }>();
    for (const ep of monthEpisodes) {
      const mode = ep.summaryMode || 'standard';
      const slot = modeAgg.get(mode) ?? { count: 0, cost: 0 };
      slot.count += 1;
      slot.cost += ep.costUsd ?? 0;
      modeAgg.set(mode, slot);
    }
    const byMode = Array.from(modeAgg.entries())
      .map(([mode, v]) => ({ mode, count: v.count, cost: v.cost }))
      .sort((a, b) => b.cost - a.cost);

    // Top podcast by cost
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

    return NextResponse.json({
      monthStart: monthStart.toISOString(),
      totalCount,
      totalCost,
      totalMinutes,
      avgCost,
      byMode,
      topPodcasts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '取得用量失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
