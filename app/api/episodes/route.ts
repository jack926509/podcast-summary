import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processEpisode } from '@/lib/services/pipeline';
import { ensureStartup } from '@/lib/startup';

export const runtime = 'nodejs';

// ── GET /api/episodes ─────────────────────────────────────────────────────────
// Query params: status?, page=1, limit=20

export async function GET(req: NextRequest) {
  await ensureStartup();
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('q')?.trim() || undefined;
    const tag = searchParams.get('tag')?.trim() || undefined;
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'publishedAt', 'title', 'status'] as const;
    type SortField = (typeof allowedSortFields)[number];
    const orderField: SortField = allowedSortFields.includes(sortBy as SortField)
      ? (sortBy as SortField)
      : 'createdAt';

    const where = {
      ...(status ? { status } : {}),
      // Full-text search across title, overview, and transcript
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { transcript: { contains: search, mode: 'insensitive' as const } },
              { summary: { overview: { contains: search, mode: 'insensitive' as const } } },
              { summary: { keyPoints: { string_contains: search } } },
            ],
          }
        : {}),
      // Tag filter — check if tags JSON array contains the tag string
      ...(tag
        ? { summary: { tags: { string_contains: tag } } }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.episode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
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

const SummaryModeSchema = z.enum(['brief', 'standard', 'deep']).default('standard');

const BatchCreateSchema = z.object({
  podcastId: z.string().min(1),
  summaryMode: SummaryModeSchema.optional(),
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
    const { podcastId, items, summaryMode = 'standard' } = BatchCreateSchema.parse(body);

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
            summaryMode,
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
      { episodeIds: episodes.map((e: { id: string }) => e.id) },
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
