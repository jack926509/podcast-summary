'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Trash2, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PaginatedResponse, EpisodeWithRelations } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  // Debounce search input → update URL after 300ms
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

  const q = searchParams.get('q') ?? '';
  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy,
    sortOrder,
    ...(status !== 'all' ? { status } : {}),
    ...(q ? { q } : {}),
  });

  const { data, mutate, isLoading } = useSWR<PaginatedResponse<EpisodeWithRelations>>(
    `/api/episodes?${query}`,
    fetcher,
    {
      // Only poll when there are episodes still being processed
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

  const handleStatusChange = (val: string) => {
    updateParams({ status: val === 'all' ? null : val, page: null });
  };

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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋標題或摘要..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36">
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
          <span className="text-xs text-muted-foreground">
            共 {data.total} 筆
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort('title')}>
                  集數標題 <SortIcon field="title" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">節目</th>
              <th className="text-left px-4 py-3 font-medium">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort('status')}>
                  狀態 <SortIcon field="status" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort('createdAt')}>
                  建立時間 <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Skeleton loading rows */}
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-48" />
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-3 flex justify-end">
                  <Skeleton className="h-8 w-8 rounded-md" />
                </td>
              </tr>
            ))}

            {!isLoading && (!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {status !== 'all' ? '此狀態下無記錄' : '尚無記錄'}
                </td>
              </tr>
            )}
            {data?.items?.map((ep) => (
              <tr key={ep.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/history/${ep.id}`}
                    className="hover:underline font-medium"
                  >
                    {truncate(ep.title, 60)}
                  </Link>
                  {ep.status === EPISODE_STATUS.ERROR && ep.errorMsg && (
                    <p className="text-xs text-destructive mt-0.5 truncate max-w-xs">
                      {ep.errorMsg}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {truncate(ep.podcast?.title ?? '—', 30)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ep.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {formatRelativeTime(ep.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(ep.id, e)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
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
              onClick={() => updateParams({ page: String(Math.min(data.totalPages, page + 1)) })}
              disabled={page === data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
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
