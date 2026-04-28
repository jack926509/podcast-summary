'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Trash2, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Tag, X, RefreshCw, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { SwipeableRow } from '@/components/episodes/swipeable-row';
import { cn, formatDuration, parseJsonField } from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PaginatedResponse, EpisodeWithRelations } from '@/lib/types';

const PAGE_SIZE = 20;
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEGMENTS = [
  { id: 'all', label: '全部' },
  { id: EPISODE_STATUS.DONE, label: '完成' },
  { id: 'processing', label: '處理中' },
  { id: EPISODE_STATUS.ERROR, label: '錯誤' },
] as const;

const SENTIMENT_RAIL: Record<string, string> = {
  看多: 'bg-success',
  看空: 'bg-destructive',
  中性: 'bg-border',
};

function formatMonthDay(date: Date | string | null) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

export function EpisodeTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const status = searchParams.get('status') ?? 'all';
  const page = Number(searchParams.get('page') ?? '1');
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = searchParams.get('sortOrder') ?? 'desc';
  const activeTag = searchParams.get('tag') ?? '';

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [sortOpen, setSortOpen] = useState(false);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleTagClick = useCallback((tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateParams({ tag: activeTag === tag ? null : tag, page: null });
  }, [activeTag, updateParams]);

  const handleSegmentClick = useCallback((segId: string) => {
    if (segId === 'all') {
      updateParams({ status: null, page: null });
    } else if (segId === 'processing') {
      // store as a virtual filter — fetch via status=processing alias below
      updateParams({ status: 'processing', page: null });
    } else {
      updateParams({ status: segId, page: null });
    }
  }, [updateParams]);

  const activeSegment =
    status === 'all'
      ? 'all'
      : status === EPISODE_STATUS.DONE
        ? EPISODE_STATUS.DONE
        : status === EPISODE_STATUS.ERROR
          ? EPISODE_STATUS.ERROR
          : (PROCESSING_STATUSES as string[]).includes(status) || status === 'processing'
            ? 'processing'
            : status;

  const q = searchParams.get('q') ?? '';
  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy,
    sortOrder,
    ...(status !== 'all' ? { status } : {}),
    ...(q ? { q } : {}),
    ...(activeTag ? { tag: activeTag } : {}),
  });

  const { data, mutate, isLoading } = useSWR<PaginatedResponse<EpisodeWithRelations>>(
    `/api/episodes?${query}`,
    fetcher,
    {
      refreshInterval: (current) => {
        const hasProcessing = current?.items?.some((ep) =>
          (PROCESSING_STATUSES as string[]).includes(ep.status),
        );
        return hasProcessing ? 5000 : 0;
      },
    },
  );

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/episodes/${deleteTarget}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mutate();
    } catch {
      toast({ title: '刪除失敗', description: '請稍後再試', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, mutate, toast]);

  const handleRetry = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRetrying((r) => ({ ...r, [id]: true }));
    try {
      await fetch(`/api/episodes/${id}/retry`, { method: 'POST' });
      mutate();
    } catch {
      toast({ title: '重試失敗', description: '請稍後再試', variant: 'destructive' });
    } finally {
      setRetrying((r) => ({ ...r, [id]: false }));
    }
  }, [mutate, toast]);

  const swipeRetry = useCallback(async (id: string) => {
    setRetrying((r) => ({ ...r, [id]: true }));
    try {
      await fetch(`/api/episodes/${id}/retry`, { method: 'POST' });
      mutate();
    } catch {
      toast({ title: '重試失敗', description: '請稍後再試', variant: 'destructive' });
    } finally {
      setRetrying((r) => ({ ...r, [id]: false }));
    }
  }, [mutate, toast]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({ sortOrder: sortOrder === 'desc' ? 'asc' : 'desc', page: null });
    } else {
      updateParams({ sortBy: field, sortOrder: 'desc', page: null });
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  return (
    <>
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/92 backdrop-blur md:top-0">
        <div className="mx-auto max-w-6xl px-5 py-3 md:px-10 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[22px] font-bold tracking-tight md:text-[28px]">
              歷史記錄{' '}
              {data && (
                <span className="ml-1 font-mono text-[14px] font-medium text-muted-foreground md:text-[16px]">
                  {data.total}
                </span>
              )}
            </h1>
            <div className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOpen((o) => !o)}
                  className="gap-1"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  排序
                </Button>
                {sortOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSortOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                      {(['createdAt', 'publishedAt', 'title', 'status'] as const).map((field) => {
                        const labels = {
                          createdAt: '建立時間',
                          publishedAt: '發布日期',
                          title: '標題',
                          status: '狀態',
                        };
                        return (
                          <button
                            key={field}
                            onClick={() => { toggleSort(field); setSortOpen(false); }}
                            className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[12.5px] hover:bg-muted"
                          >
                            <span>{labels[field]}</span>
                            <SortIcon field={field} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <Button asChild size="sm">
                <Link href="/new">
                  <Plus className="h-4 w-4" />
                  新增
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜尋標題、摘要、tickers…"
                className="h-10 pl-9"
              />
            </div>

            <div className="inline-flex w-full divide-x divide-border overflow-hidden rounded-lg border border-border bg-card text-[12px] md:ml-auto md:w-auto">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSegmentClick(s.id)}
                  className={cn(
                    'flex-1 px-3 py-2 font-medium transition-colors md:flex-none',
                    activeSegment === s.id
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active tag chip */}
          {activeTag && (
            <div className="mt-2 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11.5px] text-muted-foreground">標籤：</span>
              <button
                onClick={() => updateParams({ tag: null, page: null })}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-medium text-primary hover:bg-primary/20"
              >
                {activeTag}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl space-y-2.5 px-5 py-4 md:px-10 md:py-6">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[110px] animate-pulse rounded-xl border border-border bg-card"
          />
        ))}

        {!isLoading && (!data?.items || data.items.length === 0) && (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-muted-foreground">
            {activeTag
              ? `沒有標籤為「${activeTag}」的集數`
              : status !== 'all'
                ? '此狀態下無記錄'
                : '尚無記錄。試試清除篩選 ↺'}
          </div>
        )}

        {data?.items?.map((ep) => {
          const tags = parseJsonField<string[]>(ep.summary?.tags ?? null, []);
          const overview = ep.summary?.overview ?? '';
          const sentiment = ep.summary?.sentiment ?? null;
          const isProcessing = (PROCESSING_STATUSES as string[]).includes(ep.status);
          const rail = sentiment ? (SENTIMENT_RAIL[sentiment] ?? 'bg-border') : 'bg-border';
          const monthDay = formatMonthDay(ep.publishedAt ?? ep.createdAt);
          const canRetry = ep.status === EPISODE_STATUS.ERROR;

          return (
            <SwipeableRow
              key={ep.id}
              canRetry={canRetry}
              isRetrying={!!retrying[ep.id]}
              onRetry={canRetry ? () => swipeRetry(ep.id) : undefined}
              onDelete={() => setDeleteTarget(ep.id)}
            >
            <Link
              href={`/history/${ep.id}`}
              className="group grid grid-cols-[3px_1fr] overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/20 hover:shadow-sm"
            >
              <div className={cn(rail)} />
              <div className="p-4 md:p-5">
                {/* Row 1: title + status + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-pretty text-[14.5px] font-semibold leading-snug tracking-tight md:text-[15.5px]">
                      {ep.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
                      <b className="font-medium text-foreground">
                        {ep.podcast?.title ?? '—'}
                      </b>
                      {ep.duration && (
                        <>
                          <span>·</span>
                          <span>{formatDuration(ep.duration)}</span>
                        </>
                      )}
                      {monthDay && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{monthDay}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <StatusBadge status={ep.status} />
                    {ep.status === EPISODE_STATUS.ERROR && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={(e) => handleRetry(ep.id, e)}
                        disabled={retrying[ep.id]}
                        title="重新處理"
                      >
                        <RefreshCw
                          className={cn(
                            'h-3.5 w-3.5',
                            retrying[ep.id] && 'animate-spin',
                          )}
                        />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => handleDelete(ep.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Row 2: error message */}
                {ep.status === EPISODE_STATUS.ERROR && ep.errorMsg && (
                  <p className="mt-2 line-clamp-1 text-[12px] text-destructive">
                    {ep.errorMsg}
                  </p>
                )}

                {/* Row 2.5: live progress note while processing */}
                {isProcessing && ep.progressNote && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    {ep.progressNote}
                  </p>
                )}

                {/* Row 3: summary preview */}
                {overview && !isProcessing && (
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-foreground/75">
                    {overview}
                  </p>
                )}

                {/* Row 4: tags + sentiment */}
                {(tags.length > 0 || sentiment) && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {tags.slice(0, 4).map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => handleTagClick(tag, e)}
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors',
                            activeTag === tag
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-foreground/65 hover:bg-primary/10 hover:text-primary',
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {sentiment && (
                      <span
                        className={cn(
                          'hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold sm:inline-flex',
                          sentiment === '看多' && 'bg-success/12 text-success',
                          sentiment === '看空' && 'bg-destructive/12 text-destructive',
                          sentiment === '中性' && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {sentiment === '看多' && '▲'}
                        {sentiment === '看空' && '▼'}
                        {sentiment}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
            </SwipeableRow>
          );
        })}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11.5px] text-muted-foreground">
              第 {page} / {data.totalPages} 頁
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateParams({ page: String(Math.min(data.totalPages, page + 1)) })
                }
                disabled={page === data.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="刪除記錄"
        description="確定要刪除這筆記錄嗎？此操作無法復原，摘要與逐字稿將一併刪除。"
        confirmLabel="刪除"
        cancelLabel="取消"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
}
