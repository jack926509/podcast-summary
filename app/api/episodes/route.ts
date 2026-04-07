import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processEpisode } from '@/lib/services/pipeline';

export const runtime = 'nodejs';

// ── GET /api/episodes ─────────────────────────────────────────────────────────
// Query params: status?, page=1, limit=20

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await prisma.$transaction([
      prisma.episode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          errorMsg: true,
          duration: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          podcastId: true,
          audioUrl: true,
          // Exclude transcript — too large for list view
          podcast: {
            select: {
              id: true,
              title: true,
              author: true,
              imageUrl: true,
              feedUrl: true,
              description: true,
              createdAt: true,
            },
          },
          summary: {
            select: {
              id: true,
              overview: true,
              keyPoints: true,
              quotes: true,
              tags: true,
              createdAt: true,
              episodeId: true,
            },
          },
        },
      }),
      prisma.episode.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '取得列表失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST /api/episodes ────────────────────────────────────────────────────────
// Batch create episodes from RSS selection

const BatchCreateSchema = z.object({
  podcastId: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        audioUrl: z.string().url(),
        publishedAt: z.string().nullable().optional(),
        duration: z.number().nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { podcastId, items } = BatchCreateSchema.parse(body);

    // Verify podcast exists
    const podcast = await prisma.podcast.findUnique({ where: { id: podcastId } });
    if (!podcast) {
      return NextResponse.json({ error: '找不到對應的 Podcast' }, { status: 404 });
    }

    // Create all episodes
    const episodes = await prisma.$transaction(
      items.map((item) =>
        prisma.episode.create({
          data: {
            podcastId,
            title: item.title,
            audioUrl: item.audioUrl,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
            duration: item.duration ?? null,
            status: 'pending',
          },
        }),
      ),
    );

    // Fire-and-forget pipeline for each episode (staggered to avoid rate limits)
    for (let i = 0; i < episodes.length; i++) {
      const episodeId = episodes[i].id;
      setTimeout(() => {
        processEpisode(episodeId).catch((err) =>
          console.error(`Pipeline error for episode ${episodeId}:`, err),
        );
      }, i * 100); // 100ms stagger between each
    }

    return NextResponse.json(
      { episodeIds: episodes.map((e) => e.id) },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? '輸入格式錯誤' },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : '建立集數失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
