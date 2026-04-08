import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/podcasts — list all podcasts (subscribed first)
export async function GET() {
  try {
    const podcasts = await prisma.podcast.findMany({
      orderBy: [{ subscribed: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { episodes: true } },
      },
    });
    return NextResponse.json(podcasts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '取得訂閱清單失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
