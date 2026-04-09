import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  subscribed: z.boolean(),
});

// PATCH /api/podcasts/[id] — toggle subscription
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { subscribed } = PatchSchema.parse(body);

    const existing = await prisma.podcast.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '找不到此 Podcast' }, { status: 404 });
    }

    const podcast = await prisma.podcast.update({
      where: { id },
      data: { subscribed },
    });
    return NextResponse.json(podcast);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : '更新失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/podcasts/[id] — remove podcast and all its episodes
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.podcast.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '找不到此 Podcast' }, { status: 404 });
    }

    await prisma.podcast.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '刪除失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
