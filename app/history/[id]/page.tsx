import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { EpisodeDetail } from '@/components/episodes/episode-detail';
import { Button } from '@/components/ui/button';
import type { EpisodeWithRelations } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getEpisode(id: string): Promise<EpisodeWithRelations | null> {
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      podcast: true,
      summary: true,
    },
  });
  return episode as EpisodeWithRelations | null;
}

export default async function EpisodeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/history">
            <ChevronLeft className="h-4 w-4" />
            返回歷史記錄
          </Link>
        </Button>
      </div>

      <EpisodeDetail initialEpisode={episode} />
    </div>
  );
}
