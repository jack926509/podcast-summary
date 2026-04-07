import type { Episode, Podcast, Summary } from '@prisma/client';

// ============================================================
// Database relation types
// ============================================================

export type EpisodeWithPodcast = Episode & {
  podcast: Podcast;
};

export type EpisodeWithRelations = Episode & {
  podcast: Podcast;
  summary: Summary | null;
};

// ============================================================
// AI Service types
// ============================================================

export interface SummaryResult {
  overview: string;
  keyPoints: string[];
  quotes: string[];
  tags: string[];
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

export interface EpisodeStats {
  total: number;
  processing: number;
  done: number;
  error: number;
}
