import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';
import { parseDuration } from '@/lib/utils';

export const runtime = 'nodejs';

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['enclosure', 'enclosure'],
    ],
  },
});

type RssItem = {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  isoDate?: string;
  enclosure?: { url?: string; type?: string };
  itunesDuration?: string;
};

// POST /api/podcasts/[id]/refresh — fetch RSS and return new (untracked) episodes
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const podcast = await prisma.podcast.findUnique({ where: { id } });
    if (!podcast) {
      return NextResponse.json({ error: '找不到此 Podcast' }, { status: 404 });
    }
    if (!podcast.feedUrl) {
      return NextResponse.json({ error: '此 Podcast 沒有 RSS Feed 網址' }, { status: 400 });
    }

    // Fetch latest RSS
    const feed = await parser.parseURL(podcast.feedUrl).catch((err) => {
      throw new Error(`RSS 解析失敗：${err.message}`);
    });

    // Get all existing audioUrls for this podcast to detect new episodes
    const existing = await prisma.episode.findMany({
      where: { podcastId: id },
      select: { audioUrl: true },
    });
    const existingUrls = new Set(existing.map((e) => e.audioUrl));

    // Filter feed items to only new audio episodes
    const newEpisodes = ((feed.items ?? []) as RssItem[])
      .filter((item) => {
        const url = item.enclosure?.url;
        return url && item.enclosure?.type?.startsWith('audio/') && !existingUrls.has(url);
      })
      .slice(0, 50)
      .map((item) => ({
        guid: item.guid ?? item.link ?? item.title ?? '',
        title: item.title ?? '未命名集數',
        audioUrl: item.enclosure?.url ?? '',
        publishedAt: item.pubDate ?? item.isoDate ?? null,
        duration: parseDuration(item.itunesDuration),
      }));

    // Update lastCheckedAt
    await prisma.podcast.update({
      where: { id },
      data: { lastCheckedAt: new Date() },
    });

    return NextResponse.json({ newEpisodes, total: feed.items?.length ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '刷新失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
