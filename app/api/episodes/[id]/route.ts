import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ── GET /api/episodes/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const episode = await prisma.episode.findUnique({
      where: { id },
      include: {
        podcast: true,
        summary: true,
      },
    });

    if (!episode) {
      return NextResponse.json({ error: '找不到此集數' }, { status: 404 });
    }

    return NextResponse.json(episode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '取得集數失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE /api/episodes/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const episode = await prisma.episode.findUnique({ where: { id } });
    if (!episode) {
      return NextResponse.json({ error: '找不到此集數' }, { status: 404 });
    }

    // Clean up /tmp file if it was an uploaded file
    if (episode.audioUrl?.startsWith('/tmp/') && fs.existsSync(episode.audioUrl)) {
      try {
        fs.unlinkSync(episode.audioUrl);
      } catch {
        // Ignore
      }
    }

    // Prisma cascade will delete Summary automatically (onDelete: Cascade)
    await prisma.episode.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '刪除失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
