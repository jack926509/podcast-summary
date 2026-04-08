import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseDuration } from '@/lib/utils';

export const runtime = 'nodejs';
import type { FeedParseResult } from '@/lib/types';

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['enclosure', 'enclosure'],
    ],
  },
});

const BodySchema = z.object({
  feedUrl: z.string().url('請提供有效的 RSS Feed URL'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedUrl } = BodySchema.parse(body);

    // Parse the RSS feed
    const feed = await parser.parseURL(feedUrl).catch((err) => {
      throw new Error(`RSS 解析失敗：${err.message}`);
    });

    // Upsert Podcast record
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl },
      create: {
        title: feed.title ?? '未知節目',
        author: feed.itunes?.author ?? feed.creator ?? null,
        feedUrl,
        description: feed.description ?? null,
        imageUrl: feed.itunes?.image ?? feed.image?.url ?? null,
      },
      update: {
        title: feed.title ?? '未知節目',
        author: feed.itunes?.author ?? feed.creator ?? null,
        description: feed.description ?? null,
        imageUrl: feed.itunes?.image ?? feed.image?.url ?? null,
      },
    });

    // Map feed items to our episode structure
    type RssItem = {
      guid?: string;
      link?: string;
      title?: string;
      pubDate?: string;
      isoDate?: string;
      enclosure?: { url?: string; type?: string };
      itunesDuration?: string;
    };

    const episodes = ((feed.items ?? []) as RssItem[])
      .filter((item) => {
        return item.enclosure?.url && item.enclosure?.type?.startsWith('audio/');
      })
      .slice(0, 100) // Limit to 100 most recent episodes
      .map((item) => {

        return {
          guid: item.guid ?? item.link ?? item.title ?? '',
          title: item.title ?? '未命名集數',
          audioUrl: item.enclosure?.url ?? '',
          publishedAt: item.pubDate ?? item.isoDate ?? null,
          duration: parseDuration(item.itunesDuration),
        };
      })
      .filter((ep) => ep.audioUrl);

    const result: FeedParseResult = {
      podcast: {
        title: podcast.title,
        author: podcast.author,
        description: podcast.description,
        imageUrl: podcast.imageUrl,
        feedUrl: podcast.feedUrl ?? feedUrl,
      },
      episodes,
    };

    return NextResponse.json({ podcastId: podcast.id, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? '輸入格式錯誤' },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : '解析 Feed 時發生錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
