import Anthropic from '@anthropic-ai/sdk';
import type { SummaryResult, QAItem, WatchlistItem } from '@/lib/types';
import { TRANSCRIPT_CHUNK_CHARS } from '@/lib/constants';
import { extractCompleteKeyPoints } from './stream-parse';

// Sonnet for final (high-quality) output; Haiku for cheap chunk pre-processing
const MODEL_QUALITY = 'claude-sonnet-4-6';
const MODEL_FAST = 'claude-haiku-4-5';

const TICKER_FORMAT_RULE = `- 美股代號統一寫成 $NVDA、$AAPL、$TSLA 格式（代號前加 $）
- 台股代號統一寫成 2330（台積電）格式（4位數字後接公司名）`;

/**
 * Tool that Claude must call to submit the structured summary.
 * Using tool_use guarantees valid JSON — far more reliable than asking
 * Claude to output free-form JSON in long deep-mode responses.
 */
const SUMMARY_TOOL: Anthropic.Tool = {
  name: 'submit_summary',
  description: '提交結構化的 Podcast 摘要結果',
  input_schema: {
    type: 'object',
    properties: {
      overview: {
        type: 'string',
        description: '完整摘要文字（依模式長度不同：brief 100-150字、standard 300-500字、deep 500-800字）',
      },
      sentiment: {
        type: 'string',
        enum: ['看多', '看空', '中性'],
        description: '本集整體市場立場；非財經內容請省略此欄位',
      },
      sentimentNote: {
        type: 'string',
        description: '一句話說明立場依據（15-30字）；非財經請省略',
      },
      keyPoints: {
        type: 'array',
        items: { type: 'string' },
        description: '重點清單，每條以【類別】開頭，類別範例：【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【產業動態】【操作建議】',
      },
      quotes: {
        type: 'array',
        items: { type: 'string' },
        description: '原文金句或精彩見解',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '主題標籤，涵蓋產業、概念、地區、人名等',
      },
      actionItems: {
        type: 'array',
        items: { type: 'string' },
        description: '聽完本集後明確可執行的建議（20-60字）；無建議填空陣列',
      },
      qa: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            q: { type: 'string', description: '問題或討論主題（精簡為一句話）' },
            points: { type: 'array', items: { type: 'string' }, description: '關鍵回答要點' },
          },
          required: ['q', 'points'],
        },
        description: 'Q&A 或問答討論段落；無則空陣列',
      },
      watchlist: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '公司或標的名稱' },
            ticker: { type: 'string', description: '$NVDA 或 2330（台積電）格式；無代號則省略' },
            market: { type: 'string', enum: ['美股', '台股', '港股', '其他'] },
            sentiment: { type: 'string', enum: ['看多', '看空', '中性', '觀望'] },
            risk: { type: 'string', enum: ['高', '中', '低'] },
            event: { type: 'string', description: '近期事件或催化劑（30-80字）' },
            viewpoint: { type: 'string', description: '主持人/分析師的觀點與操作建議（30-80字）' },
          },
          required: ['name', 'market', 'sentiment', 'risk', 'event', 'viewpoint'],
        },
        description: '所有被分析的股票/公司/標的；無則空陣列',
      },
    },
    required: ['overview', 'keyPoints', 'quotes', 'tags', 'actionItems', 'qa', 'watchlist'],
  },
};

const SYSTEM_PROMPT = `你是一位專業的財經與知識型 Podcast 摘要專家。請仔細分析逐字稿，提取對投資者與知識學習者最有價值的資訊，並透過 submit_summary 工具以繁體中文回填結果。

內容要求：
- overview：300-500 字，依序涵蓋背景脈絡 → 核心論點 → 重要數字或案例 → 結論與啟示
- sentiment：依本集整體市場立場填看多 / 看空 / 中性；非財經內容請省略此欄位
- keyPoints：6-10 條，每條以【類別】開頭
- quotes：3-5 個最有洞見、最值得記錄的原文金句
- tags：4-8 個精準標籤
- actionItems：2-4 條明確可執行的建議；非財經或無建議時填空陣列
- qa：若有 Q&A 段落則提取，每題 2-4 個要點
- watchlist：提取所有被分析的股票/公司/標的
${TICKER_FORMAT_RULE}`;

const CHUNK_PROMPT = `你是內容摘要助理。請簡潔摘要以下 Podcast 片段，透過 submit_summary 工具以繁體中文回填：
- overview：本片段核心內容（100-200 字）
- keyPoints：3-6 條重點
- quotes：1-2 個金句
- tags：2-4 個標籤
- actionItems / qa / watchlist：本階段請填空陣列（最終整合階段才處理）`;

const SYNTHESIS_PROMPT = `你是一位專業的財經與知識型 Podcast 摘要專家。以下是同一集 Podcast 各片段的初步摘要，請整合成一份完整、高品質的最終摘要，透過 submit_summary 工具以繁體中文回填。

內容要求：
- overview：300-500 字，背景脈絡 → 核心論點 → 重要數字/案例 → 結論與啟示
- keyPoints：6-10 條，以類別【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【操作建議】等開頭
- quotes：3-5 個最有洞見的原文語句
- tags：4-8 個精準標籤
- actionItems：2-4 條明確可執行建議；非財經或無建議時填空陣列
- qa：整合各片段 Q&A 討論；無則空陣列
- watchlist：整合各片段提及的所有股票/公司分析；無則空陣列
- 去除重複資訊，保留最有價值的內容
${TICKER_FORMAT_RULE}`;

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

/** Convert Claude tool_use input into our SummaryResult shape with safe defaults. */
function normalizeSummary(input: Record<string, unknown>): SummaryResult {
  const qa: QAItem[] = Array.isArray(input.qa)
    ? input.qa
        .filter((item: unknown): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && 'q' in item,
        )
        .map((item: Record<string, unknown>) => ({
          q: String(item.q ?? ''),
          points: Array.isArray(item.points) ? item.points.map(String) : [],
        }))
    : [];

  const watchlist: WatchlistItem[] = Array.isArray(input.watchlist)
    ? input.watchlist
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

  return {
    overview: String(input.overview ?? ''),
    sentiment: input.sentiment ? String(input.sentiment) : null,
    sentimentNote: input.sentimentNote ? String(input.sentimentNote) : null,
    keyPoints: Array.isArray(input.keyPoints) ? input.keyPoints.map(String) : [],
    quotes: Array.isArray(input.quotes) ? input.quotes.map(String) : [],
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    qa,
    watchlist,
    actionItems: Array.isArray(input.actionItems) ? input.actionItems.map(String) : [],
  };
}

interface ClaudeCallResult {
  result: SummaryResult;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface ClaudeCallOptions {
  retries?: number;
  maxTokens?: number;
  /**
   * Called as Claude streams. Receives only newly-closed key-point strings so the
   * caller can surface them to the UI before the full JSON document is valid.
   */
  onKeyPoint?: (keyPoint: string) => void | Promise<void>;
}

/** Call Claude API with retry logic, returning usage alongside parsed result */
async function callClaude(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userContent: string,
  options: ClaudeCallOptions = {},
): Promise<ClaudeCallResult> {
  const { retries = 3, maxTokens, onKeyPoint } = options;
  let lastError: Error | null = null;
  const resolvedMaxTokens = maxTokens ?? (model === MODEL_FAST ? 1024 : 2048);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Streaming path: emit key-points as they close so the UI shows live progress
      if (onKeyPoint) {
        let inputJsonAccum = '';
        let emitted = 0;
        const stream = client.messages.stream({
          model,
          max_tokens: resolvedMaxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          tools: [SUMMARY_TOOL],
          tool_choice: { type: 'tool', name: SUMMARY_TOOL.name },
        });
        stream.on('streamEvent', (event) => {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'input_json_delta'
          ) {
            inputJsonAccum += event.delta.partial_json;
            const list = extractCompleteKeyPoints(inputJsonAccum);
            if (list && list.length > emitted) {
              const fresh = list.slice(emitted);
              emitted = list.length;
              for (const kp of fresh) {
                Promise.resolve(onKeyPoint(kp)).catch(() => undefined);
              }
            }
          }
        });
        const finalMsg = await stream.finalMessage();
        const block = finalMsg.content.find((b: Anthropic.ContentBlock) => b.type === 'tool_use');
        if (!block || block.type !== 'tool_use') {
          throw new Error('Claude response missing tool_use block');
        }
        return {
          result: normalizeSummary(block.input as Record<string, unknown>),
          inputTokens: finalMsg.usage?.input_tokens ?? 0,
          outputTokens: finalMsg.usage?.output_tokens ?? 0,
          model,
        };
      }

      const response = await client.messages.create({
        model,
        max_tokens: resolvedMaxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        tools: [SUMMARY_TOOL],
        tool_choice: { type: 'tool', name: SUMMARY_TOOL.name },
      });

      const block = response.content.find((b) => b.type === 'tool_use');
      if (!block || block.type !== 'tool_use') {
        throw new Error('Claude response missing tool_use block');
      }
      return {
        result: normalizeSummary(block.input as Record<string, unknown>),
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        model,
      };
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
  brief: `你是一位專業的財經 Podcast 摘要助理。請快速提取本集最核心的 3 個重點，透過 submit_summary 工具以繁體中文回填：
- overview：1-2 段簡短摘要（100-150 字），只含最重要的結論
- keyPoints：3 條，以【類別】開頭
- quotes：1 個最值得記錄的金句
- tags：3 個標籤
- actionItems / qa / watchlist：填空陣列
${TICKER_FORMAT_RULE}`,

  standard: SYSTEM_PROMPT,

  deep: `你是一位專業的財經與知識型 Podcast 深度分析師。請全面分析逐字稿，透過 submit_summary 工具以繁體中文回填：
- overview：500-800 字深度摘要，依序涵蓋宏觀背景 → 核心論述 → 數據/案例支撐 → 市場影響 → 操作啟示
- keyPoints：10-15 條，細分類別如【市場觀點】【投資策略】【數據】【趨勢】【風險提示】【概念解析】【產業動態】【操作建議】【反向觀點】【時間框架】
- quotes：5-8 個最有洞見、最獨到的原文金句
- tags：6-10 個涵蓋產業、概念、地區、人名、事件的精準標籤
- actionItems：2-5 條明確可執行的深度行動建議；非財經或無建議時填空陣列
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
export interface SummarizeOptions {
  onProgress?: (note: string) => void | Promise<void>;
  /** Called once per newly-completed key-point during streaming */
  onKeyPoint?: (keyPoint: string) => void | Promise<void>;
}

export interface SummarizeUsage {
  inputTokens: number;
  outputTokens: number;
  /** 各 model 累計 token：用於後續更精準的成本計算 */
  byModel: Record<string, { input: number; output: number }>;
}

export interface SummarizeOutcome {
  result: SummaryResult;
  usage: SummarizeUsage;
}

function emptyUsage(): SummarizeUsage {
  return { inputTokens: 0, outputTokens: 0, byModel: {} };
}

function addUsage(acc: SummarizeUsage, call: ClaudeCallResult): void {
  acc.inputTokens += call.inputTokens;
  acc.outputTokens += call.outputTokens;
  const slot = acc.byModel[call.model] ?? { input: 0, output: 0 };
  slot.input += call.inputTokens;
  slot.output += call.outputTokens;
  acc.byModel[call.model] = slot;
}

export async function summarizeTranscript(
  transcript: string,
  mode: SummaryMode = 'standard',
  options: SummarizeOptions = {},
): Promise<SummarizeOutcome> {
  const { onProgress, onKeyPoint } = options;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = MODE_SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPT;
  // brief mode: always single-call Sonnet (short output anyway)
  const maxTokens = mode === 'brief' ? 1024 : mode === 'deep' ? 4096 : 2048;

  const usage = emptyUsage();

  if (transcript.length <= TRANSCRIPT_CHUNK_CHARS * 2 || mode === 'brief') {
    // Short enough (or brief mode) — single Sonnet call, stream key-points live
    await onProgress?.('生成摘要中…');
    const call = await callClaude(client, MODEL_QUALITY, systemPrompt, transcript, {
      maxTokens,
      onKeyPoint,
    });
    addUsage(usage, call);
    return { result: call.result, usage };
  }

  // Map phase: cheap Haiku per chunk — parallelised (max 3 concurrent), no streaming
  const chunks = chunkTranscript(transcript, TRANSCRIPT_CHUNK_CHARS);
  await onProgress?.(`分析片段中（共 ${chunks.length} 段）…`);
  const chunkCalls = await parallelMap(
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
  for (const call of chunkCalls) addUsage(usage, call);
  const chunkSummaries = chunkCalls.map((c) => c.result);

  // Reduce phase: Sonnet synthesises into the final high-quality summary
  const combinedText = chunkSummaries
    .map((s, i) => `## 片段 ${i + 1}\n${s.overview}`)
    .join('\n\n');

  const allKeyPoints = chunkSummaries.flatMap((s) => s.keyPoints);
  const allQuotes = chunkSummaries.flatMap((s) => s.quotes);
  const allTags = Array.from(new Set(chunkSummaries.flatMap((s) => s.tags)));

  await onProgress?.('整合最終摘要中…');
  const finalCall = await callClaude(
    client,
    MODEL_QUALITY,
    SYNTHESIS_PROMPT,
    `請整合以下各片段摘要，生成完整的最終摘要：\n\n${combinedText}\n\n收集到的重點：\n${allKeyPoints.join('\n')}\n\n收集到的金句：\n${allQuotes.join('\n')}\n\n收集到的標籤：${allTags.join('、')}`,
    { maxTokens, onKeyPoint },
  );
  addUsage(usage, finalCall);
  const finalSummary = finalCall.result;

  return {
    result: {
      overview: finalSummary.overview,
      sentiment: finalSummary.sentiment,
      sentimentNote: finalSummary.sentimentNote,
      keyPoints: finalSummary.keyPoints.length > 0 ? finalSummary.keyPoints : allKeyPoints.slice(0, 10),
      quotes: finalSummary.quotes.length > 0 ? finalSummary.quotes : allQuotes.slice(0, 6),
      tags: finalSummary.tags.length > 0 ? finalSummary.tags : allTags.slice(0, 8),
      qa: finalSummary.qa,
      watchlist: finalSummary.watchlist,
      actionItems: finalSummary.actionItems,
    },
    usage,
  };
}
