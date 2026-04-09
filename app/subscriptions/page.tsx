'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Rss, RefreshCw, Trash2, BellOff, Bell, PlusCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/utils';
import type { FeedEpisodeItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface PodcastRow {
  id: string;
  title: string;
  author: string | null;
  imageUrl: string | null;
  feedUrl: string | null;
  subscribed: boolean;
  lastCheckedAt: string | null;
  _count: { episodes: number };
}

interface NewEpisodeResult {
  podcastId: string;
  newEpisodes: FeedEpisodeItem[];
  total: number;
}

// ── Podcast cover image ──────────────────────────────────────────────────────

function PodcastCover({ imageUrl, title, size = 'md' }: { imageUrl: string | null; title: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-10 w-10' : 'h-14 w-14';
  const iconCls = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={title} className={`${cls} rounded-xl object-cover flex-shrink-0`} />
  ) : (
    <div className={`${cls} rounded-xl bg-muted flex-shrink-0 flex items-center justify-center`}>
      <Rss className={`${iconCls} text-muted-foreground`} />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { data: podcasts, mutate } = useSWR<PodcastRow[]>('/api/podcasts', fetcher);
  const { toast } = useToast();

  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [newEps, setNewEps] = useState<Record<string, FeedEpisodeItem[]>>({});
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [subscribing, setSubscribing] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // Mobile: which podcast card is expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSubscribe = async (podcast: PodcastRow) => {
    const next = !podcast.subscribed;
    setSubscribing((s) => ({ ...s, [podcast.id]: true }));
    try {
      const res = await fetch(`/api/podcasts/${podcast.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? '操作失敗');
      }
      mutate();
      toast({
        title: next ? '訂閱成功' : '已取消訂閱',
        description: next
          ? `已將「${podcast.title}」加入我的訂閱`
          : `已從我的訂閱移除「${podcast.title}」`,
      });
    } catch (err) {
      toast({
        title: next ? '訂閱失敗' : '取消訂閱失敗',
        description: err instanceof Error ? err.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setSubscribing((s) => ({ ...s, [podcast.id]: false }));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/podcasts/${deleteTarget}`, { method: 'DELETE' });
    setDeleteTarget(null);
    mutate();
  };

  const refresh = useCallback(async (podcast: PodcastRow) => {
    setRefreshing((r) => ({ ...r, [podcast.id]: true }));
    setErrors((e) => ({ ...e, [podcast.id]: '' }));
    setNewEps((n) => ({ ...n, [podcast.id]: [] }));
    try {
      const res = await fetch(`/api/podcasts/${podcast.id}/refresh`, { method: 'POST' });
      const data: NewEpisodeResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error);
      setNewEps((n) => ({ ...n, [podcast.id]: data.newEpisodes }));
      setSelected((s) => ({ ...s, [podcast.id]: new Set(data.newEpisodes.map((e) => e.guid)) }));
      mutate();
    } catch (err) {
      setErrors((e) => ({ ...e, [podcast.id]: err instanceof Error ? err.message : '刷新失敗' }));
    } finally {
      setRefreshing((r) => ({ ...r, [podcast.id]: false }));
    }
  }, [mutate]);

  const toggleEp = (podcastId: string, guid: string) => {
    setSelected((s) => {
      const set = new Set(s[podcastId] ?? []);
      if (set.has(guid)) set.delete(guid); else set.add(guid);
      return { ...s, [podcastId]: set };
    });
  };

  const addToQueue = async (podcast: PodcastRow) => {
    const eps = newEps[podcast.id] ?? [];
    const items = eps.filter((e) => selected[podcast.id]?.has(e.guid));
    if (items.length === 0) return;
    setSubmitting((s) => ({ ...s, [podcast.id]: true }));
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcast.id,
          items: items.map((e) => ({ title: e.title, audioUrl: e.audioUrl, publishedAt: e.publishedAt, duration: e.duration })),
        }),
      });
      if (!res.ok) throw new Error('加入佇列失敗');
      setNewEps((n) => ({ ...n, [podcast.id]: [] }));
      setSelected((s) => ({ ...s, [podcast.id]: new Set() }));
    } catch (err) {
      setErrors((e) => ({ ...e, [podcast.id]: err instanceof Error ? err.message : '加入失敗' }));
    } finally {
      setSubmitting((s) => ({ ...s, [podcast.id]: false }));
    }
  };

  const subscribed = podcasts?.filter((p) => p.subscribed) ?? [];
  const unsubscribed = podcasts?.filter((p) => !p.subscribed) ?? [];

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 max-w-3xl mx-auto space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">我的訂閱</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理已訂閱的 Podcast，並檢查是否有新集數。
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/new?tab=rss">
            <PlusCircle className="h-4 w-4 mr-1" />
            新增訂閱
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {podcasts && subscribed.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Rss className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">尚未訂閱任何 Podcast。</p>
          <Button asChild variant="link" size="sm" className="mt-2">
            <Link href="/new?tab=rss">前往新增任務，解析 RSS Feed 後即可訂閱</Link>
          </Button>
        </div>
      )}

      {/* ── Mobile: 2-column icon grid ─────────────────────────────────── */}
      {subscribed.length > 0 && (
        <>
          {/* Mobile grid (hidden on md+) */}
          <div className="md:hidden space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {subscribed.map((podcast) => (
                <MobilePodcastTile
                  key={podcast.id}
                  podcast={podcast}
                  expanded={expandedId === podcast.id}
                  refreshing={refreshing[podcast.id] ?? false}
                  subscribing={subscribing[podcast.id] ?? false}
                  submitting={submitting[podcast.id] ?? false}
                  error={errors[podcast.id] ?? ''}
                  newEpisodes={newEps[podcast.id] ?? []}
                  selectedGuids={selected[podcast.id] ?? new Set()}
                  onToggleExpand={() => setExpandedId((id) => id === podcast.id ? null : podcast.id)}
                  onRefresh={() => refresh(podcast)}
                  onToggleEp={(guid) => toggleEp(podcast.id, guid)}
                  onAddToQueue={() => addToQueue(podcast)}
                  onUnsubscribe={() => toggleSubscribe(podcast)}
                  onDelete={() => setDeleteTarget(podcast.id)}
                />
              ))}
            </div>
          </div>

          {/* Desktop cards (hidden below md) */}
          <div className="hidden md:block space-y-4">
            {subscribed.map((podcast) => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                refreshing={refreshing[podcast.id] ?? false}
                submitting={submitting[podcast.id] ?? false}
                error={errors[podcast.id] ?? ''}
                newEpisodes={newEps[podcast.id] ?? []}
                selectedGuids={selected[podcast.id] ?? new Set()}
                onRefresh={() => refresh(podcast)}
                onToggleEp={(guid) => toggleEp(podcast.id, guid)}
                onAddToQueue={() => addToQueue(podcast)}
                onToggleSubscribe={() => toggleSubscribe(podcast)}
                onDelete={() => setDeleteTarget(podcast.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Previously parsed but not subscribed */}
      {unsubscribed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground border-b pb-2">
            已解析（未訂閱）
          </h2>
          {unsubscribed.map((podcast) => (
            <div key={podcast.id} className="flex items-center gap-3 rounded-lg border p-3">
              <PodcastCover imageUrl={podcast.imageUrl} title={podcast.title} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{podcast.title}</p>
                <p className="text-xs text-muted-foreground">
                  {podcast.author ?? ''}{podcast.author && ' · '}{podcast._count.episodes} 集已記錄
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSubscribe(podcast)}
                disabled={subscribing[podcast.id]}
              >
                {subscribing[podcast.id]
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <Bell className="h-4 w-4 mr-1" />}
                {subscribing[podcast.id] ? '訂閱中...' : '訂閱'}
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(podcast.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="移除 Podcast"
        description="確定要移除此 Podcast 及所有集數記錄嗎？此操作無法復原。"
        confirmLabel="移除"
        cancelLabel="取消"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}

// ── Mobile tile ──────────────────────────────────────────────────────────────

interface MobileTileProps {
  podcast: PodcastRow;
  expanded: boolean;
  refreshing: boolean;
  subscribing: boolean;
  submitting: boolean;
  error: string;
  newEpisodes: FeedEpisodeItem[];
  selectedGuids: Set<string>;
  onToggleExpand: () => void;
  onRefresh: () => void;
  onToggleEp: (guid: string) => void;
  onAddToQueue: () => void;
  onUnsubscribe: () => void;
  onDelete: () => void;
}

function MobilePodcastTile({
  podcast, expanded, refreshing, subscribing, submitting, error,
  newEpisodes, selectedGuids,
  onToggleExpand, onRefresh, onToggleEp, onAddToQueue, onUnsubscribe, onDelete,
}: MobileTileProps) {
  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Icon area — tap to expand */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-left"
      >
        {/* Cover art — square */}
        <div className="relative w-full aspect-square bg-muted">
          {podcast.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Rss className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          {/* Episode count badge */}
          <div className="absolute bottom-1.5 right-1.5">
            <span className="rounded-full bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5">
              {podcast._count.episodes} 集
            </span>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between gap-1 px-2.5 py-2">
          <p className="text-xs font-medium line-clamp-2 flex-1 leading-tight">{podcast.title}</p>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          }
        </div>
      </button>

      {/* Expanded management panel */}
      {expanded && (
        <div className="border-t px-2.5 pb-3 pt-2 space-y-2 bg-muted/30">
          {/* Action buttons */}
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs px-2"
              onClick={onRefresh}
              disabled={refreshing || !podcast.feedUrl}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '檢查中...' : '新集數'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onUnsubscribe}
              disabled={subscribing}
              title="取消訂閱"
            >
              {subscribing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="移除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Last checked */}
          {podcast.lastCheckedAt && (
            <p className="text-[10px] text-muted-foreground">
              上次檢查：{new Date(podcast.lastCheckedAt).toLocaleDateString('zh-TW')}
            </p>
          )}

          {/* Error */}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* New episodes panel */}
          {newEpisodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">新 {newEpisodes.length} 集</p>
                <button
                  type="button"
                  className="text-[10px] text-primary underline"
                  onClick={() => newEpisodes.forEach((e) => onToggleEp(e.guid))}
                >
                  {selectedGuids.size === newEpisodes.length ? '全取消' : '全選'}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded border bg-background p-1.5">
                {newEpisodes.map((ep) => (
                  <label key={ep.guid} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGuids.has(ep.guid)}
                      onChange={() => onToggleEp(ep.guid)}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{ep.title}</p>
                      {ep.duration && <p className="text-[10px] text-muted-foreground">{formatDuration(ep.duration)}</p>}
                    </div>
                  </label>
                ))}
              </div>
              <Button
                onClick={onAddToQueue}
                disabled={selectedGuids.size === 0 || submitting || selectedGuids.size > 20}
                size="sm"
                className="w-full h-8 text-xs"
              >
                {submitting ? '加入中...' : `加入佇列（${selectedGuids.size} 集）`}
              </Button>
            </div>
          )}

          {/* No new episodes */}
          {!refreshing && newEpisodes.length === 0 && podcast.lastCheckedAt && !error && (
            <p className="text-[10px] text-muted-foreground">目前沒有新集數。</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Desktop card ─────────────────────────────────────────────────────────────

interface PodcastCardProps {
  podcast: PodcastRow;
  refreshing: boolean;
  submitting: boolean;
  error: string;
  newEpisodes: FeedEpisodeItem[];
  selectedGuids: Set<string>;
  onRefresh: () => void;
  onToggleEp: (guid: string) => void;
  onAddToQueue: () => void;
  onToggleSubscribe: () => void;
  onDelete: () => void;
}

function PodcastCard({
  podcast, refreshing, submitting, error,
  newEpisodes, selectedGuids,
  onRefresh, onToggleEp, onAddToQueue, onToggleSubscribe, onDelete,
}: PodcastCardProps) {
  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        <PodcastCover imageUrl={podcast.imageUrl} title={podcast.title} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{podcast.title}</p>
          {podcast.author && <p className="text-xs text-muted-foreground">{podcast.author}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary">{podcast._count.episodes} 集已記錄</Badge>
            {podcast.lastCheckedAt && (
              <span className="text-xs text-muted-foreground">
                上次檢查：{new Date(podcast.lastCheckedAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing || !podcast.feedUrl}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '檢查中...' : '檢查新集數'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleSubscribe} title="取消訂閱">
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete} title="移除">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && <p className="px-4 pb-3 text-sm text-destructive">{error}</p>}

      {newEpisodes.length > 0 && (
        <div className="border-t bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">發現 {newEpisodes.length} 集新集數</p>
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => newEpisodes.forEach((e) => onToggleEp(e.guid))}
            >
              {selectedGuids.size === newEpisodes.length ? '全部取消' : '全部選擇'}
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 rounded border bg-background p-2">
            {newEpisodes.map((ep) => (
              <label key={ep.guid} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGuids.has(ep.guid)}
                  onChange={() => onToggleEp(ep.guid)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ep.title}</p>
                  {ep.duration && <p className="text-xs text-muted-foreground">{formatDuration(ep.duration)}</p>}
                </div>
              </label>
            ))}
          </div>
          <Button
            onClick={onAddToQueue}
            disabled={selectedGuids.size === 0 || submitting || selectedGuids.size > 20}
            size="sm"
            className="w-full"
          >
            {submitting ? '加入中...' : `加入處理佇列（${selectedGuids.size} 集）`}
          </Button>
        </div>
      )}

      {!refreshing && newEpisodes.length === 0 && podcast.lastCheckedAt && !error && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">目前沒有新集數。</p>
      )}
    </div>
  );
}
