'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Trash2, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatRelativeTime, formatDuration, parseJsonField, truncate } from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PaginatedResponse, EpisodeWithRelations } from '@/lib/types';

const PAGE_SIZE = 20;
const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleTagClick = useCallback((tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateParams({ tag: activeTag === tag ? null : tag, page: null });
  }, [activeTag, updateParams]);

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

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({ sortOrder: sortOrder === 'desc' ? 'asc' : 'desc', page: null });
    } else {
      updateParams({ sortBy: field, sortOrder: 'desc', page: null });
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-4">
      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋標題、摘要、逐字稿..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={status} onValueChange={(val) => updateParams({ status: val === 'all' ? null : val, page: null })}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value={EPISODE_STATUS.PENDING}>等待中</SelectItem>
            <SelectItem value={EPISODE_STATUS.TRANSCRIBING}>轉錄中</SelectItem>
            <SelectItem value={EPISODE_STATUS.SUMMARIZING}>摘要中</SelectItem>
            <SelectItem value={EPISODE_STATUS.DONE}>完成</SelectItem>
            <SelectItem value={EPISODE_STATUS.ERROR}>錯誤</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-xs text-muted-foreground ml-1">共 {data.total} 筆</span>
        )}
      </div>

      {/* Active tag filter pill */}
      {activeTag && (
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">標籤篩選：</span>
          <button
            onClick={() => updateParams({ tag: null, page: null })}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            {activeTag}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Sort bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-b pb-2">
        <span>排序：</span>
        {(['createdAt', 'title', 'status'] as const).map((field) => {
          const labels = { createdAt: '時間', title: '標題', status: '狀態' };
          return (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className="flex items-center hover:text-foreground transition-colors"
            >
              {labels[field]} <SortIcon field={field} />
            </button>
          );
        })}
      </div>

      {/* ── Episode cards ───────────────────────────────────────── */}
      <div className="space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}

        {!isLoading && (!data?.items || data.items.length === 0) && (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
            {activeTag ? `沒有標籤為「${activeTag}」的集數` : status !== 'all' ? '此狀態下無記錄' : '尚無記錄'}
          </div>
        )}

        {data?.items?.map((ep) => {
          const tags = parseJsonField<string[]>(ep.summary?.tags ?? null, []);
          const overview = ep.summary?.overview ?? '';
          const isProcessing = (PROCESSING_STATUSES as string[]).includes(ep.status);

          return (
            <Link
              key={ep.id}
              href={`/history/${ep.id}`}
              className="block rounded-lg border bg-card hover:bg-muted/40 transition-colors p-4 group"
            >
              {/* Row 1: title + status + delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug group-hover:underline truncate">
                    {ep.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ep.podcast?.title ?? '—'}
                    {ep.duration ? ` · ${formatDuration(ep.duration)}` : ''}
                    {' · '}{formatRelativeTime(ep.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <StatusBadge status={ep.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={(e) => handleDelete(ep.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Row 2: error message */}
              {ep.status === EPISODE_STATUS.ERROR && ep.errorMsg && (
                <p className="text-xs text-destructive mt-1.5 line-clamp-1">{ep.errorMsg}</p>
              )}

              {/* Row 3: summary preview */}
              {overview && !isProcessing && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {overview}
                </p>
              )}

              {/* Row 4: tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => handleTagClick(tag, e)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        activeTag === tag
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            第 {page} / {data.totalPages} 頁
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => updateParams({ page: String(Math.min(data.totalPages, page + 1)) })}
              disabled={page === data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
