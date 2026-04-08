import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { EpisodeWithPodcast } from '@/lib/types';

interface RecentTasksProps {
  episodes: EpisodeWithPodcast[];
}

export function RecentTasks({ episodes }: RecentTasksProps) {
  if (episodes.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">最近任務</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history" className="text-xs text-muted-foreground">
              查看全部 <ChevronRight className="h-3 w-3 ml-1 inline" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            尚無任務。前往「新增任務」開始處理第一集 Podcast。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">最近任務</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/history" className="text-xs text-muted-foreground">
            查看全部 <ChevronRight className="h-3 w-3 ml-1 inline" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <Link
                href={`/history/${episode.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {truncate(episode.title, 60)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {episode.podcast.title} · {formatRelativeTime(episode.createdAt)}
                  </p>
                </div>
                <StatusBadge status={episode.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
        {episodes.length >= 5 && (
          <div className="px-6 py-3 border-t">
            <Link
              href="/history"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              前往歷史記錄查看全部 →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
