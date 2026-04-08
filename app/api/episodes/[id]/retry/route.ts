import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processEpisode } from '@/lib/services/pipeline';
import { EPISODE_STATUS } from '@/lib/constants';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const episode = await prisma.episode.findUnique({ where: { id } });
    if (!episode) {
      return NextResponse.json({ error: '找不到此集數' }, { status: 404 });
    }

    if (episode.status !== EPISODE_STATUS.ERROR) {
      return NextResponse.json(
        { error: '只有處理失敗的集數才能重新處理' },
        { status: 400 },
      );
    }

    // Reset to pending and clear error
    await prisma.episode.update({
      where: { id },
      data: { status: EPISODE_STATUS.PENDING, errorMsg: null },
    });

    // Fire-and-forget
    processEpisode(id).catch((err) =>
      console.error(`Retry pipeline error for episode ${id}:`, err),
    );

    return NextResponse.json({ message: '已重新排入處理佇列' }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
