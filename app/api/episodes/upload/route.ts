import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { processEpisode } from '@/lib/services/pipeline';
import { MAX_UPLOAD_BYTES, MANUAL_PODCAST_TITLE } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: '請選擇音檔' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: '只接受音訊檔案 (mp3, wav, m4a 等)' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_BYTES) {
      const maxMB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);
      return NextResponse.json(
        { error: `檔案大小不能超過 ${maxMB}MB` },
        { status: 400 },
      );
    }

    // Determine extension
    const ext = path.extname(file.name) || '.mp3';
    tmpPath = `/tmp/upload-${randomUUID()}${ext}`;

    // Write file to /tmp
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tmpPath, Buffer.from(buffer));

    // Ensure a "Manual Uploads" podcast exists
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl: '__manual__' },
      create: {
        title: MANUAL_PODCAST_TITLE,
        feedUrl: '__manual__',
      },
      update: {},
    });

    // Create Episode record
    const episode = await prisma.episode.create({
      data: {
        podcastId: podcast.id,
        title: title ?? file.name.replace(/\.[^.]+$/, ''),
        audioUrl: tmpPath,
        status: 'pending',
      },
    });

    // Fire-and-forget: do NOT await
    processEpisode(episode.id).catch((err) =>
      console.error(`Pipeline error for episode ${episode.id}:`, err),
    );

    return NextResponse.json({ episodeId: episode.id }, { status: 202 });
  } catch (err) {
    // Clean up tmp file if Episode creation failed
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }
    const msg = err instanceof Error ? err.message : '上傳失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
