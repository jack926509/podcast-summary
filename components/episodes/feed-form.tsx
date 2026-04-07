'use client';

import { useState } from 'react';
import { Rss, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDuration } from '@/lib/utils';
import type { FeedEpisodeItem, FeedPodcastMeta } from '@/lib/types';

interface FeedFormProps {
  onSuccess: (episodeIds: string[]) => void;
}

export function FeedForm({ onSuccess }: FeedFormProps) {
  const [feedUrl, setFeedUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [podcast, setPodcast] = useState<(FeedPodcastMeta & { id: string }) | null>(null);
  const [episodes, setEpisodes] = useState<FeedEpisodeItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setPodcast(null);
    setEpisodes([]);
    setSelected(new Set());

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: feedUrl.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? '解析失敗');
        return;
      }

      setPodcast({ ...data.podcast, id: data.podcastId });
      setEpisodes(data.episodes ?? []);
    } catch {
      setParseError('網路連線錯誤，請稍後再試');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleSelect = (guid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guid)) next.delete(guid);
      else next.add(guid);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === episodes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(episodes.map((e) => e.guid)));
    }
  };

  const handleSubmit = async () => {
    if (!podcast || selected.size === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const items = episodes
      .filter((ep) => selected.has(ep.guid))
      .map((ep) => ({
        title: ep.title,
        audioUrl: ep.audioUrl,
        publishedAt: ep.publishedAt,
        duration: ep.duration,
      }));

    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId: podcast.id, items }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? '建立集數失敗');
        return;
      }

      onSuccess(data.episodeIds ?? []);
    } catch {
      setSubmitError('網路連線錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL input */}
      <form onSubmit={handleParse} className="space-y-2">
        <Label htmlFor="feed-url">RSS Feed 網址</Label>
        <div className="flex gap-2">
          <Input
            id="feed-url"
            type="url"
            placeholder="https://example.com/podcast/feed.xml"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            disabled={isParsing}
          />
          <Button type="submit" disabled={isParsing || !feedUrl.trim()}>
            {isParsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rss className="h-4 w-4" />
            )}
            {isParsing ? '解析中...' : '解析'}
          </Button>
        </div>
        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
      </form>

      {/* Podcast info */}
      {podcast && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-start gap-3">
            {podcast.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={podcast.imageUrl}
                alt={podcast.title}
                className="h-16 w-16 rounded-md object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm">{podcast.title}</p>
              {podcast.author && (
                <p className="text-xs text-muted-foreground">{podcast.author}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                找到 {episodes.length} 集
              </p>
            </div>
          </div>

          {/* Episode list */}
          {episodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">選擇要處理的集數（最多 20 集）</Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary underline"
                >
                  {selected.size === episodes.length ? '全部取消' : '全部選擇'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 rounded border bg-background p-2">
                {episodes.map((ep) => (
                  <label
                    key={ep.guid}
                    className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(ep.guid)}
                      onChange={() => toggleSelect(ep.guid)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{ep.title}</p>
                      {ep.duration && (
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(ep.duration)}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || isSubmitting || selected.size > 20}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                建立中...
              </>
            ) : (
              `處理已選 ${selected.size} 集`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
