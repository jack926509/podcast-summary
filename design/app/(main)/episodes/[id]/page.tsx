// app/(main)/episodes/[id]/page.tsx
import { notFound } from "next/navigation";
import { EpisodeDetail } from "@/components/podcast/episode-detail";
import { EPISODES } from "@/lib/mock-data";

export default function EpisodeDetailPage({ params }: { params: { id: string } }) {
  const ep = EPISODES.find((e) => e.id === params.id);
  if (!ep) return notFound();
  return <EpisodeDetail ep={ep} />;
}

export function generateStaticParams() {
  return EPISODES.map((e) => ({ id: e.id }));
}
