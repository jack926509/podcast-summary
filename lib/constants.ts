export const EPISODE_STATUS = {
  PENDING: 'pending',
  TRANSCRIBING: 'transcribing',
  SUMMARIZING: 'summarizing',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type EpisodeStatus = (typeof EPISODE_STATUS)[keyof typeof EPISODE_STATUS];

export const PROCESSING_STATUSES: EpisodeStatus[] = [
  EPISODE_STATUS.PENDING,
  EPISODE_STATUS.TRANSCRIBING,
  EPISODE_STATUS.SUMMARIZING,
];

/** Whisper API 單檔大小上限（25MB） */
export const WHISPER_SIZE_LIMIT = 25 * 1024 * 1024;

/** ffmpeg 分段時長（秒），10 分鐘 */
export const CHUNK_DURATION_SECONDS = 600;

/** 前端輪詢間隔（毫秒） */
export const POLLING_INTERVAL_MS = 3000;

/** 上傳檔案大小上限（bytes），預設 500MB */
export const MAX_UPLOAD_BYTES = parseInt(
  process.env.MAX_UPLOAD_SIZE ?? '524288000',
  10,
);

/** 手動上傳集數的虛擬 Podcast 名稱 */
export const MANUAL_PODCAST_TITLE = '手動上傳';

/** 遠端音檔下載大小上限（bytes），預設 500MB */
export const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;

/** Claude 摘要分段字元數上限（中文適用，超過此值啟用 map-reduce） */
export const TRANSCRIPT_CHUNK_CHARS = 8000;
