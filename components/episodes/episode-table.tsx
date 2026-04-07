'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { EPISODE_STATUS } from '@/lib/constants';
import type { PaginatedResponse, EpisodeWithRelations } from '@/lib/types';

const PAGE_SIZE = 20;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function EpisodeTable() {
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(status !== 'all' ? { status } : {}),
  });

  const { data, mutate, isLoading } = useSWR<PaginatedResponse<EpisodeWithRelations>>(
    `/api/episodes?${query}`,
    fetcher,
    { refreshInterval: 5000 },
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('確定要刪除這筆記錄嗎？')) return;
      await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
      mutate();
    },
    [mutate],
  );

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">狀態篩選：</span>
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
              <th className="text-left px-4 py-3 font-medium">集數標題</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">節目</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">建立時間</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  載入中...
                </td>
              </tr>
            )}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
