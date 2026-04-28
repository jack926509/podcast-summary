/**
 * USD 計費表（per 1M token / per minute）
 * 來源：Anthropic / Groq / OpenAI 公開定價（2025–2026）
 * 更新時請同步 .env.example 註解。
 */

export const TRANSCRIBE_PRICING = {
  // Groq Whisper-large-v3：$0.04/hour（按音檔分鐘計費）
  groq: 0.04 / 60,
  // OpenAI Whisper-1：$0.006/min
  openai: 0.006,
} as const;

const CLAUDE_PRICING = {
  // Sonnet 4.6: $3 / $15 per 1M
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  // Haiku 4.5: $1 / $5 per 1M
  'claude-haiku-4-5': { input: 1 / 1_000_000, output: 5 / 1_000_000 },
} as const;

export type TranscribeProvider = keyof typeof TRANSCRIBE_PRICING;

export function transcribeCost(provider: TranscribeProvider, minutes: number): number {
  return TRANSCRIBE_PRICING[provider] * minutes;
}

export function claudeCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING] ?? CLAUDE_PRICING['claude-sonnet-4-6'];
  return p.input * inputTokens + p.output * outputTokens;
}

/** 格式化美金金額：$0.0023 → "$0.0023"，>= $1 → "$1.23" */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}
