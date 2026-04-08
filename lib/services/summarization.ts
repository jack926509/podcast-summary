import Anthropic from '@anthropic-ai/sdk';
import type { SummaryResult } from '@/lib/types';
import { TRANSCRIPT_CHUNK_CHARS } from '@/lib/constants';

const SYSTEM_PROMPT = `你是一位專業的 Podcast 內容摘要助理。請仔細分析提供的逐字稿，並以繁體中文回應。

你必須只輸出以下格式的有效 JSON，不要包含任何其他文字、說明或 markdown 標記：

{
  "overview": "2-3 段的整體內容摘要，涵蓋主要主題與結論",
  "keyPoints": ["重點1", "重點2", "重點3"],
  "quotes": ["值得記錄的金句或精彩段落1", "金句2"],
  "tags": ["主題標籤1", "標籤2", "標籤3"]
}

規則：
- overview：200-400 字的完整摘要
- keyPoints：5-10 個條列式重點
- quotes：3-6 個原文金句或精彩表達
- tags：3-8 個主題關鍵字標籤
- 所有內容使用繁體中文`;

const SYNTHESIS_PROMPT = `你是一位專業的內容整合助理。以下是一個 Podcast 各段落的摘要，請整合成一份完整的最終摘要。

只輸出以下格式的有效 JSON：

{
  "overview": "整合後的整體摘要（2-3 段）",
  "keyPoints": ["整合後的重點列表"],
  "quotes": ["整合後的金句列表"],
  "tags": ["整合後的標籤"]
}`;

/**
 * Split transcript into chunks by character count.
 * Tries to break at sentence boundaries (。！？\n) to avoid mid-sentence cuts.
 * Works correctly for both Chinese and English transcripts.
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

    // Try to find a sentence boundary within the last 20% of the chunk
    const searchFrom = start + Math.floor(maxChars * 0.8);
    const segment = transcript.slice(searchFrom, end);
    const boundaryMatch = segment.search(/[。！？\n]/);

    const splitAt =
      boundaryMatch >= 0
        ? searchFrom + boundaryMatch + 1 // include the punctuation
        : end;

    chunks.push(transcript.slice(start, splitAt));
    start = splitAt;
  }

  return chunks;
}

/** Extract JSON object from Claude response (handles markdown code blocks) */
function extractJson(text: string): SummaryResult {
  // Strip markdown code blocks if present
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  // Find the first complete JSON object
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in Claude response');
  }
  const parsed = JSON.parse(match[0]);
  return {
    overview: String(parsed.overview ?? ''),
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes.map(String) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
  };
}

/** Call Claude API with retry logic */
async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userContent: string,
  retries = 3,
): Promise<SummaryResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return extractJson(text);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Claude API failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Summarize a podcast transcript using Claude.
 * Uses map-reduce strategy for long transcripts (> TRANSCRIPT_CHUNK_CHARS * 2).
 * Uses character count instead of word count to handle Chinese transcripts correctly.
 */
export async function summarizeTranscript(transcript: string): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  if (transcript.length <= TRANSCRIPT_CHUNK_CHARS * 2) {
    // Short enough for a single call
    return callClaude(client, SYSTEM_PROMPT, transcript);
  }

  // Map phase: summarize each chunk independently
  const chunks = chunkTranscript(transcript, TRANSCRIPT_CHUNK_CHARS);
  const chunkSummaries: SummaryResult[] = [];

  for (const chunk of chunks) {
    const summary = await callClaude(
      client,
      SYSTEM_PROMPT,
      `請摘要以下這段 Podcast 內容（這是整集的一個片段）：\n\n${chunk}`,
    );
    chunkSummaries.push(summary);
  }

  // Reduce phase: synthesize all chunk summaries
  const combinedText = chunkSummaries
    .map((s, i) => `## 段落 ${i + 1}\n${s.overview}`)
    .join('\n\n');

  const allKeyPoints = chunkSummaries.flatMap((s) => s.keyPoints);
  const allQuotes = chunkSummaries.flatMap((s) => s.quotes);
  const allTags = Array.from(new Set(chunkSummaries.flatMap((s) => s.tags)));

  const finalSummary = await callClaude(
    client,
    SYNTHESIS_PROMPT,
    `請整合以下各段落摘要：\n\n${combinedText}\n\n所有重點：\n${allKeyPoints.join('\n')}\n\n所有金句：\n${allQuotes.join('\n')}\n\n所有標籤：${allTags.join('、')}`,
  );

  return {
    overview: finalSummary.overview,
    keyPoints: finalSummary.keyPoints.length > 0 ? finalSummary.keyPoints : allKeyPoints.slice(0, 10),
    quotes: finalSummary.quotes.length > 0 ? finalSummary.quotes : allQuotes.slice(0, 8),
    tags: finalSummary.tags.length > 0 ? finalSummary.tags : allTags.slice(0, 10),
  };
}
