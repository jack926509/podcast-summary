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

/**
 * Detect Apple Podcasts URLs and resolve to the actual RSS feed URL
 * via the iTunes Lookup API.
 * Supports formats:
 *   https://podcasts.apple.com/.../id1234567890
 *   https://podcasts.apple.com/.../id1234567890?i=...
 */
async function resolveApplePodcastsUrl(url: string): Promise<string> {
  const match = url.match(/podcasts\.apple\.com\/.+\/id(\d+)/);
  if (!match) return url;

  const podcastId = match[1];
  const lookupUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`;
  const res = await fetch(lookupUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`iTunes API 回應錯誤 ${res.status}`);

  const data = await res.json() as { results?: Array<{ feedUrl?: string; kind?: string }> };
  const podcast = data.results?.find((r) => r.kind === 'podcast' || r.feedUrl);
  if (!podcast?.feedUrl) {
    throw new Error('無法從 Apple Podcasts 取得 RSS Feed 網址，請直接貼上 RSS Feed URL');
  }
  return podcast.feedUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedUrl: rawUrl } = BodySchema.parse(body);

    // Resolve Apple Podcasts page URLs to actual RSS feed URLs
    const feedUrl = await resolveApplePodcastsUrl(rawUrl);

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
