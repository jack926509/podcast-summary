import type { Episode, Podcast, Summary } from '@prisma/client';

// ============================================================
// Database relation types
// ============================================================

export type EpisodeWithRelations = Episode & {
  podcast: Podcast;
  summary: Summary | null;
};

// ============================================================
// AI Service types
// ============================================================

export interface QAItem {
  q: string;
  points: string[];
}

export interface WatchlistItem {
  name: string;
  ticker: string | null;
  market: string;
  sentiment: '看多' | '看空' | '中性' | '觀望';
  risk: '高' | '中' | '低';
  event: string;
  viewpoint: string;
}

export interface SummaryResult {
  overview: string;
  sentiment: string | null;
  sentimentNote: string | null;
  keyPoints: string[];
  quotes: string[];
  tags: string[];
  qa: QAItem[];
  watchlist: WatchlistItem[];
  actionItems: string[];
}

// ============================================================
// RSS Feed types
// ============================================================

export interface FeedEpisodeItem {
  guid: string;
  title: string;
  audioUrl: string;
  publishedAt: string | null;
  duration: number | null; // seconds
}

export interface FeedPodcastMeta {
  title: string;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  feedUrl: string;
}

export interface FeedParseResult {
  podcast: FeedPodcastMeta;
  episodes: FeedEpisodeItem[];
}

// ============================================================
// API response wrapper
// ============================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ============================================================
// Dashboard stats
// ============================================================

export interface DashboardStats {
  total: number;
  monthAdded: number;
  monthDelta: number;
  bullCount7d: number;
  byStatus: {
    done: number;
    transcribing: number;
    summarizing: number;
    error: number;
  };
}
