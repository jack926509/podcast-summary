import Anthropic from '@anthropic-ai/sdk';
import type { SummaryResult, QAItem, WatchlistItem } from '@/lib/types';
import { TRANSCRIPT_CHUNK_CHARS } from '@/lib/constants';

// Sonnet for final (high-quality) output; Haiku for cheap chunk pre-processing
const MODEL_QUALITY = 'claude-sonnet-4-6';
const MODEL_FAST = 'claude-haiku-4-5';

const TICKER_FORMAT_RULE = `- 美股代號統一寫成 $NVDA、$AAPL、$TSLA 格式（代號前加 $）
- 台股代號統一寫成 2330（台積電）格式（4位數字後接公司名）`;

const WATCHLIST_SCHEMA = `  "watchlist": [
    {
      "name": "公司或標的名稱",
      "ticker": "$NVDA 或 2330（台積電）格式，無代號填 null",
      "market": "美股|台股|港股|其他",
      "sentiment": "看多|看空|中性|觀望",
      "risk": "高|中|低",
      "event": "近期事件或催化劑（30-80字）",
      "viewpoint": "主持人/分析師的觀點與操作建議（30-80字）"
    }
  ]`;

const QA_SCHEMA = `  "qa": [
    {
      "q": "問題或討論主題（精簡為一句話）",
      "points": ["關鍵回答要點1", "要點2", "要點3"]
    }
  ]`;

const SYSTEM_PROMPT = `你是一位專業的財經與知識型 Podcast 摘要專家。請仔細分析逐字稿，提取對投資者與知識學習者最有價值的資訊，以繁體中文回應。

只輸出以下格式的有效 JSON，不包含任何其他文字或 markdown：

{
  "overview": "3-4 段完整摘要，含本集核心主題、重要結論與值得關注的觀點",
  "sentiment": "看多|看空|中性（依本集整體市場立場判斷；非財經內容填 null）",
  "sentimentNote": "一句話說明市場立場依據（15-30字；非財經填 null）",
  "keyPoints": [
    "【類別】具體重點，盡量包含數字、名稱或可行動的資訊",
    "..."
  ],
  "quotes": ["原文金句或精彩見解（保留講者語氣）"],
  "tags": ["主題標籤"],
  "actionItems": ["明確可執行的行動建議（20-60字）"],
${QA_SCHEMA},
${WATCHLIST_SCHEMA}
}

規則：
- overview：300-500 字，依序涵蓋：背景脈絡 → 核心論點 → 重要數字或案例 → 結論與啟示
- sentiment：看多（整體偏多/樂觀）/ 看空（整體偏空/悲觀）/ 中性（平衡或不確定），非財經內容填 null
- keyPoints：6-10 條，每條以【類別】開頭，類別範例：
  【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【產業動態】【操作建議】
- quotes：3-5 個最有洞見、最值得記錄的原文語句
- tags：4-8 個精準標籤，涵蓋產業、概念、地區、人名等維度
- actionItems：2-4 條聽完本集後明確可執行的建議，例如「留意下週 $NVDA 財報」「觀察某指標是否突破」「考慮分批佈局某標的」；非財經或無明確建議時填空陣列 []
- qa：若有 Q&A 或問答討論段落則提取（無則空陣列 []）；每題 2-4 個要點
- watchlist：提取所有被分析的股票/公司/標的（無則空陣列 []）；event 寫客觀事件，viewpoint 寫主觀觀點
- 所有內容使用繁體中文
${TICKER_FORMAT_RULE}`;

const CHUNK_PROMPT = `你是內容摘要助理。請簡潔摘要以下 Podcast 片段，以繁體中文輸出有效 JSON：

{
  "overview": "此片段的核心內容（100-200 字）",
  "keyPoints": ["重點1", "重點2"],
  "quotes": ["金句"],
  "tags": ["標籤"],
  "qa": [],
  "watchlist": []
}`;

const SYNTHESIS_PROMPT = `你是一位專業的財經與知識型 Podcast 摘要專家。以下是同一集 Podcast 各片段的初步摘要，請整合成一份完整、高品質的最終摘要。

只輸出以下格式的有效 JSON：

{
  "overview": "3-4 段完整摘要，含核心主題、重要結論、值得關注的觀點",
  "sentiment": "看多|看空|中性（依整集整體市場立場；非財經填 null）",
  "sentimentNote": "一句話說明立場依據（15-30字；非財經填 null）",
  "keyPoints": [
    "【類別】具體重點（含數字/名稱/可行動資訊）"
  ],
  "quotes": ["最值得記錄的原文金句"],
  "tags": ["精準主題標籤"],
  "actionItems": ["明確可執行的行動建議（20-60字）"],
${QA_SCHEMA},
${WATCHLIST_SCHEMA}
}

規則：
- overview：300-500 字，背景脈絡 → 核心論點 → 重要數字/案例 → 結論與啟示
- keyPoints：6-10 條，以【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【操作建議】等類別開頭
- quotes：3-5 個最有洞見的原文語句
- tags：4-8 個涵蓋產業、概念、地區、人名的精準標籤
- actionItems：2-4 條聽完本集後明確可執行的建議；非財經或無明確建議時填空陣列 []
- qa：整合各片段中的 Q&A 討論；無則空陣列
- watchlist：整合各片段提及的所有股票/公司分析；無則空陣列
- 去除重複資訊，保留最有價值的內容`;

/**
 * Run async tasks with a bounded concurrency limit.
 * Workers pull from a shared index so chunks are processed in order but without blocking.
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

/**
 * Split transcript into chunks by character count.
 * Tries to break at sentence boundaries (。！？\n) to avoid mid-sentence cuts.
 */
function chunkTranscript(transcript: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < transcript.length) {
    const end = start + maxChars;
    if (end >= transcript.length) {
      chunks.push(transcript.slice(start));
      break;
    }

    const searchFrom = start + Math.floor(maxChars * 0.8);
    const segment = transcript.slice(searchFrom, end);
    const boundaryMatch = segment.search(/[。！？\n]/);

    const splitAt =
      boundaryMatch >= 0
        ? searchFrom + boundaryMatch + 1
        : end;

    chunks.push(transcript.slice(start, splitAt));
    start = splitAt;
  }

  return chunks;
}

/** Extract JSON object from Claude response (handles markdown code blocks) */
function extractJson(text: string): SummaryResult {
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in Claude response');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`Failed to parse Claude JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  const qa: QAItem[] = Array.isArray(parsed.qa)
    ? parsed.qa
        .filter((item: unknown): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && 'q' in item,
        )
        .map((item: Record<string, unknown>) => ({
          q: String(item.q ?? ''),
          points: Array.isArray(item.points) ? item.points.map(String) : [],
        }))
    : [];

  const watchlist: WatchlistItem[] = Array.isArray(parsed.watchlist)
    ? parsed.watchlist
        .filter((item: unknown): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && 'name' in item,
        )
        .map((item: Record<string, unknown>) => ({
          name: String(item.name ?? ''),
          ticker: item.ticker ? String(item.ticker) : null,
          market: String(item.market ?? '其他'),
          sentiment: String(item.sentiment ?? '中性') as WatchlistItem['sentiment'],
          risk: String(item.risk ?? '中') as WatchlistItem['risk'],
          event: String(item.event ?? ''),
          viewpoint: String(item.viewpoint ?? ''),
        }))
    : [];

  const actionItems: string[] = Array.isArray(parsed.actionItems)
    ? parsed.actionItems.map(String)
    : [];

  return {
    overview: String(parsed.overview ?? ''),
    sentiment: parsed.sentiment && parsed.sentiment !== 'null' ? String(parsed.sentiment) : null,
    sentimentNote: parsed.sentimentNote && parsed.sentimentNote !== 'null' ? String(parsed.sentimentNote) : null,
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes.map(String) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    qa,
    watchlist,
    actionItems,
  };
}

/** Call Claude API with retry logic */
async function callClaude(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userContent: string,
  retries = 3,
  maxTokens?: number,
): Promise<SummaryResult> {
  let lastError: Error | null = null;
  const resolvedMaxTokens = maxTokens ?? (model === MODEL_FAST ? 1024 : 2048);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: resolvedMaxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      return extractJson(text);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Claude API failed after ${retries} attempts: ${lastError?.message}`);
}

export type SummaryMode = 'brief' | 'standard' | 'deep';

const MODE_SYSTEM_PROMPTS: Record<SummaryMode, string> = {
  brief: `你是一位專業的財經 Podcast 摘要助理。請快速提取本集最核心的 3 個重點，以繁體中文輸出。

只輸出有效 JSON：
{
  "overview": "1-2 段簡短摘要（100-150 字），只含最重要的結論",
  "sentiment": "看多|看空|中性|null",
  "sentimentNote": "一句話（15-30字）|null",
  "keyPoints": ["【類別】重點1", "【類別】重點2", "【類別】重點3"],
  "quotes": ["1 個最值得記錄的金句"],
  "tags": ["標籤1", "標籤2", "標籤3"],
  "qa": [],
  "watchlist": []
}
${TICKER_FORMAT_RULE}`,

  standard: SYSTEM_PROMPT,

  deep: `你是一位專業的財經與知識型 Podcast 深度分析師。請全面分析逐字稿，以繁體中文回應。

只輸出有效 JSON：
{
  "overview": "4-5 段深度摘要（500-800 字），含背景脈絡、核心論點、數字佐證、市場影響、個人觀點",
  "sentiment": "看多|看空|中性（依整集整體市場立場；非財經填 null）",
  "sentimentNote": "一句話說明立場依據（15-30字；非財經填 null）",
  "keyPoints": [
    "【類別】具體重點（含數字、名稱、可行動資訊）"
  ],
  "quotes": ["最有洞見的原文語句"],
  "tags": ["精準標籤"],
  "actionItems": ["明確可執行的行動建議（20-60字）"],
${QA_SCHEMA},
${WATCHLIST_SCHEMA}
}

規則：
- overview：500-800 字，深度分析包含：宏觀背景 → 核心論述 → 數據/案例支撐 → 市場影響 → 操作啟示
- keyPoints：10-15 條，細分類別如【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【產業動態】【操作建議】【反向觀點】【時間框架】
- quotes：5-8 個最有洞見、最獨到的原文金句
- tags：6-10 個涵蓋產業、概念、地區、人名、事件的精準標籤
- actionItems：2-5 條明確可執行的深度行動建議；非財經或無明確建議時填空陣列 []
- qa：深度提取所有 Q&A 討論，每題 3-5 個要點
- watchlist：完整分析所有提及的股票/公司，event 與 viewpoint 各 50-100字
${TICKER_FORMAT_RULE}`,
};

/**
 * Summarize a podcast transcript using Claude.
 *
 * Cost strategy:
 * - Short transcripts  → Sonnet (single call, best quality)
 * - Long transcripts   → Haiku per chunk (cheap) + Sonnet for final synthesis (quality)
 *
 * This keeps quality high for the output users actually read,
 * while minimising token cost on bulk chunk pre-processing.
 */
export async function summarizeTranscript(transcript: string, mode: SummaryMode = 'standard'): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = MODE_SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPT;
  // brief mode: always single-call Sonnet (short output anyway)
  const maxTokens = mode === 'brief' ? 1024 : mode === 'deep' ? 4096 : 2048;

  if (transcript.length <= TRANSCRIPT_CHUNK_CHARS * 2 || mode === 'brief') {
    // Short enough (or brief mode) — use Sonnet directly for best quality
    return callClaude(client, MODEL_QUALITY, systemPrompt, transcript, 3, maxTokens);
  }

  // Map phase: cheap Haiku per chunk — parallelised (max 3 concurrent)
  const chunks = chunkTranscript(transcript, TRANSCRIPT_CHUNK_CHARS);
  const chunkSummaries = await parallelMap(
    chunks,
    (chunk) =>
      callClaude(
        client,
        MODEL_FAST,
        CHUNK_PROMPT,
        `請摘要以下 Podcast 片段（這是整集的一部分）：\n\n${chunk}`,
      ),
    3,
  );

  // Reduce phase: Sonnet synthesises into the final high-quality summary
  const combinedText = chunkSummaries
    .map((s, i) => `## 片段 ${i + 1}\n${s.overview}`)
    .join('\n\n');

  const allKeyPoints = chunkSummaries.flatMap((s) => s.keyPoints);
  const allQuotes = chunkSummaries.flatMap((s) => s.quotes);
  const allTags = Array.from(new Set(chunkSummaries.flatMap((s) => s.tags)));

  const finalSummary = await callClaude(
    client,
    MODEL_QUALITY,
    SYNTHESIS_PROMPT,
    `請整合以下各片段摘要，生成完整的最終摘要：\n\n${combinedText}\n\n收集到的重點：\n${allKeyPoints.join('\n')}\n\n收集到的金句：\n${allQuotes.join('\n')}\n\n收集到的標籤：${allTags.join('、')}`,
    3,
    maxTokens,
  );

  return {
    overview: finalSummary.overview,
    sentiment: finalSummary.sentiment,
    sentimentNote: finalSummary.sentimentNote,
    keyPoints: finalSummary.keyPoints.length > 0 ? finalSummary.keyPoints : allKeyPoints.slice(0, 10),
    quotes: finalSummary.quotes.length > 0 ? finalSummary.quotes : allQuotes.slice(0, 6),
    tags: finalSummary.tags.length > 0 ? finalSummary.tags : allTags.slice(0, 8),
    qa: finalSummary.qa,
    watchlist: finalSummary.watchlist,
    actionItems: finalSummary.actionItems,
  };
}
