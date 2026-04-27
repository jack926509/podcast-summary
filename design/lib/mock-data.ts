// lib/mock-data.ts
// 後端串接前的假資料層 — 之後可改為 from `@/lib/api` fetch

export type EpisodeStatus = "done" | "transcribing" | "summarizing" | "error";
export type Sentiment = "bull" | "bear" | "neu";
export type KeyPointCategory = "market" | "data" | "risk" | "strat";

export interface Episode {
  id: string;
  title: string;
  show: string;
  duration: string;
  publishedAt: string; // YYYY-MM-DD
  createdAt: string;   // ISO timestamp
  status: EpisodeStatus;
  sentiment: Sentiment;
  category: string;
  tags: string[];
  excerpt: string;
  tickers: string[];
  bullCount: number;
  bearCount: number;
}

export interface KeyPoint {
  n: number;
  category: KeyPointCategory;
  body: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  view: Sentiment;
  target: string;
  note: string;
}

export interface DashboardStats {
  total: number;
  monthAdded: number;
  monthDelta: number;
  byStatus: Record<EpisodeStatus, number>;
}

export const STATS: DashboardStats = {
  total: 142,
  monthAdded: 23,
  monthDelta: 6,
  byStatus: { done: 128, transcribing: 2, summarizing: 1, error: 11 },
};

export const EPISODES: Episode[] = [
  {
    id: "214",
    title: "EP.214 美股財報週前瞻 — 半導體與 AI 概念再起",
    show: "投資先生", duration: "42 min",
    publishedAt: "2026-04-24", createdAt: "2026-04-24T14:22:00Z",
    status: "done", sentiment: "bull", category: "市場觀點",
    tags: ["#半導體", "#AI", "#財報季"],
    excerpt: "下週財報週開盤前觀察，NVDA、AVGO 法說重點與 AI 供應鏈…",
    tickers: ["NVDA", "AVGO", "AMD", "TSM", "SOXL"],
    bullCount: 4, bearCount: 1,
  },
  {
    id: "M98",
    title: "M觀點 #98 聯準會利率政策對台股的影響",
    show: "財經M觀點", duration: "58 min",
    publishedAt: "2026-04-23", createdAt: "2026-04-23T12:08:00Z",
    status: "summarizing", sentiment: "neu", category: "總經",
    tags: ["#FOMC", "#台股"],
    excerpt: "逐字稿已產生，AI 摘要分析中… 約 30 秒",
    tickers: [], bullCount: 0, bearCount: 0,
  },
  {
    id: "213",
    title: "EP.213 巴菲特股東會重點整理",
    show: "投資先生", duration: "1h 12m",
    publishedAt: "2026-04-22", createdAt: "2026-04-22T18:30:00Z",
    status: "done", sentiment: "bear", category: "投資策略",
    tags: ["#巴菲特", "#價值投資"],
    excerpt: "三大重點：現金部位創新高、能源股加碼、對 AI 的審慎觀點…",
    tickers: ["BRK.B", "AAPL", "OXY"], bullCount: 0, bearCount: 2,
  },
  {
    id: "212",
    title: "市場放大鏡 PCE 數據解讀",
    show: "市場放大鏡", duration: "—",
    publishedAt: "2026-04-22", createdAt: "2026-04-22T09:15:00Z",
    status: "error", sentiment: "neu", category: "總經",
    tags: [],
    excerpt: "音檔下載失敗 — 請檢查 URL 後重試",
    tickers: [], bullCount: 0, bearCount: 0,
  },
  {
    id: "211",
    title: "EP.211 從 ASML 法說看半導體設備循環",
    show: "投資先生", duration: "48 min",
    publishedAt: "2026-04-20", createdAt: "2026-04-20T15:00:00Z",
    status: "done", sentiment: "bull", category: "產業觀察",
    tags: ["#半導體設備", "#資本支出"],
    excerpt: "ASML 訂單能見度、China revenue 占比變化、EUV 出貨節奏…",
    tickers: ["ASML", "LRCX", "AMAT"], bullCount: 3, bearCount: 0,
  },
];

export const KEYPOINTS: KeyPoint[] = [
  { n: 1, category: "market", body: "半導體類股短線修正提供買點，但須留意 [NVDA] 法說的「預期管理」效應 — 過去四季均出現 beat-and-fall 反應。" },
  { n: 2, category: "data",   body: "費城半導體指數 [SOX] 年初至今 **+18%**，相對 [SPX] 多 6 個百分點。" },
  { n: 3, category: "risk",   body: "美中晶片管制 5 月升級可能性提高，[AMD]/[NVDA] 中國營收占比 12% 以上者首當其衝。" },
  { n: 4, category: "strat",  body: "建議將 AI 概念部位從個股移轉至 [SOXX] / [SMH] ETF，分散單一公司財報風險。" },
  { n: 5, category: "market", body: "若 [NVDA] 法說後跌破 **$820** 支撐，可能觸發系統性 risk-off，連帶拖累 SPX 1–2%。" },
  { n: 6, category: "data",   body: "Bloomberg 半導體分析師共識：Q2 EPS YoY +24%，已 price-in 高基期。" },
  { n: 7, category: "risk",   body: "地緣政治：台海情勢若升溫，[TSM] ADR 短線承壓機率高。" },
  { n: 8, category: "strat",  body: "AI 供應鏈關注：散熱（Vertiv）、HBM（SK Hynix、Micron）、CoWoS 產能（[TSM]）。" },
];

export const WATCHLIST: WatchlistItem[] = [
  { symbol: "NVDA", name: "NVIDIA",     view: "bull", target: "$1,050", note: "法說前布局" },
  { symbol: "AVGO", name: "Broadcom",   view: "bull", target: "$1,420", note: "AI ASIC 訂單" },
  { symbol: "AMD",  name: "AMD",        view: "neu",  target: "$170",   note: "觀望" },
  { symbol: "TSM",  name: "TSMC ADR",   view: "bull", target: "$165",   note: "CoWoS 受惠" },
  { symbol: "SOXL", name: "費半 3x",     view: "bear", target: "—",     note: "波動過大" },
];

export const KEYPOINT_TABS = [
  { id: "keypts", label: "重點",   count: 8 as number | null },
  { id: "sum",    label: "摘要",   count: null },
  { id: "wl",     label: "標的",   count: 5 },
  { id: "act",    label: "行動",   count: 3 },
  { id: "qa",     label: "Q&A",    count: 4 },
  { id: "quote",  label: "金句",   count: null },
  { id: "tx",     label: "逐字稿", count: null },
] as const;
