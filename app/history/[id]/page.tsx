import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EpisodeDetail } from '@/components/episodes/episode-detail';
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

  return <EpisodeDetail initialEpisode={episode} />;
}
