import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merger for shadcn/ui components */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format seconds to "1h 23m" or "45m" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Format date to relative time like "2 小時前" */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return d.toLocaleDateString('zh-TW');
}

/** Format date to "YYYY/MM/DD HH:mm" */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Safely cast a Prisma JsonValue field (PostgreSQL) to the expected type.
 * Also handles legacy string-encoded JSON for compatibility.
 */
export function parseJsonField<T>(json: unknown, fallback: T): T {
  if (json === null || json === undefined) return fallback;
  if (typeof json === 'string') {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }
  return json as T;
}

/** Truncate text to maxLen characters, appending "..." */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

/** Parse RSS itunes duration string ("1:23:45" or "83:45" or "300") to seconds */
export function parseDuration(duration: string | undefined | null): number | null {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
