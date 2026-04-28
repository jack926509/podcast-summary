'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Quote, Loader2, AlertCircle, Copy, Check, RefreshCw,
  Download, TrendingUp, TrendingDown, Minus, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatBadge } from '@/components/shared/cat-badge';
import { useEpisodePolling } from '@/hooks/use-episode-polling';
import { useToast } from '@/hooks/use-toast';
import {
  cn, parseJsonField, formatDateTime, formatDuration, parseTickerSegments,
} from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import type { EpisodeWithRelations, QAItem, WatchlistItem } from '@/lib/types';

interface EpisodeDetailProps {
  initialEpisode: EpisodeWithRelations;
}

type TabId = 'keypts' | 'sum' | 'wl' | 'act' | 'qa' | 'quote' | 'tx';

function parseKeyPoint(point: string): { category: string | null; text: string } {
  const m = point.match(/^【(.+?)】(.+)$/);
  if (m) return { category: m[1], text: m[2].trim() };
  return { category: null, text: point };
}

function TickerText({ text, className }: { text: string; className?: string }) {
  const segments = parseTickerSegments(text);
  if (segments.length === 1 && !segments[0].isTicker) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.isTicker ? (
          <mark
            key={i}
            className="rounded bg-warning/14 px-1 font-mono text-[.92em] font-semibold text-warning-foreground not-italic"
            style={{ fontStyle: 'normal' }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

function WatchlistTable({
  items,
  onSearch,
}: {
  items: WatchlistItem[];
  onSearch: (q: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">標的</th>
              <th className="px-4 py-2 text-left font-medium">立場</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">風險</th>
              <th className="px-4 py-2 text-left font-medium">事件 / 觀點</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((w, i) => (
              <tr key={`${w.name}-${i}`}>
                <td className="px-4 py-3 align-top">
                  <button
                    onClick={() => onSearch(w.name)}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {w.name}
                  </button>
                  {w.ticker && (
                    <button
                      onClick={() => onSearch(w.ticker!)}
                      className="ml-1.5 rounded bg-warning/20 px-1 font-mono text-[11.5px] font-semibold text-warning-foreground hover:bg-warning/40"
                    >
                      {w.ticker}
                    </button>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{w.market}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  {w.sentiment === '看多' && (
                    <span className="inline-flex items-center gap-1 font-medium text-success">▲ 看多</span>
                  )}
                  {w.sentiment === '看空' && (
                    <span className="inline-flex items-center gap-1 font-medium text-destructive">▼ 看空</span>
                  )}
                  {w.sentiment === '中性' && (
                    <span className="text-muted-foreground">— 中性</span>
                  )}
                  {w.sentiment === '觀望' && (
                    <span className="text-warning">… 觀望</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 align-top md:table-cell">
                  <span
                    className={cn(
                      'font-medium',
                      w.risk === '高' && 'text-destructive',
                      w.risk === '中' && 'text-warning',
                      w.risk === '低' && 'text-success',
                    )}
                  >
                    {w.risk}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <TickerText
                      text={w.event}
                      className="block text-[12.5px] leading-relaxed text-foreground"
                    />
                    <TickerText
                      text={w.viewpoint}
                      className="block text-[12px] leading-relaxed text-muted-foreground"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QABlock({ item, index }: { item: QAItem; index: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          Q
        </span>
        <p className="text-[14px] font-medium leading-snug">{item.q}</p>
      </div>
      <ul className="ml-7 space-y-1.5">
        {item.points.map((point, j) => (
          <li key={j} className="flex items-start gap-2">
            <span className="mt-1 flex-shrink-0 font-mono text-[10px] font-bold text-muted-foreground">
              {index + 1}.{j + 1}
            </span>
            <TickerText
              text={point}
              className="text-[13.5px] leading-relaxed text-foreground/85"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EpisodeDetail({ initialEpisode }: EpisodeDetailProps) {
  const { episode, isPolling } = useEpisodePolling(initialEpisode);
  const { toast } = useToast();
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const summary = episode.summary;
  const summaryAny = summary as (typeof summary) & {
    sentiment?: string | null;
    sentimentNote?: string | null;
    qa?: unknown;
    watchlist?: unknown;
    actionItems?: unknown;
  };
  const keyPoints = parseJsonField<string[]>(summary?.keyPoints ?? null, []);
  const quotes = parseJsonField<string[]>(summary?.quotes ?? null, []);
  const tags = parseJsonField<string[]>(summary?.tags ?? null, []);
  const qa = parseJsonField<QAItem[]>(summaryAny?.qa ?? null, []);
  const watchlist = parseJsonField<WatchlistItem[]>(summaryAny?.watchlist ?? null, []);
  const actionItems = parseJsonField<string[]>(summaryAny?.actionItems ?? null, []);
  const sentiment = summaryAny?.sentiment ?? null;
  const sentimentNote = summaryAny?.sentimentNote ?? null;
  const isProcessing = (PROCESSING_STATUSES as string[]).includes(episode.status);
  const hasTranscript = Boolean(episode.transcript);

  const tabs: { id: TabId; label: string; count: number | null }[] = useMemo(
    () => [
      { id: 'keypts', label: '重點', count: keyPoints.length },
      { id: 'sum', label: '摘要', count: null },
      { id: 'wl', label: '標的', count: watchlist.length },
      { id: 'act', label: '行動', count: actionItems.length },
      { id: 'qa', label: 'Q&A', count: qa.length },
      { id: 'quote', label: '金句', count: quotes.length },
      { id: 'tx', label: '逐字稿', count: null },
    ],
    [keyPoints.length, watchlist.length, actionItems.length, qa.length, quotes.length],
  );

  const defaultTab: TabId = keyPoints.length > 0 ? 'keypts' : 'sum';
  const [tab, setTab] = useState<TabId>(defaultTab);

  // Quick-scan data
  const quickPoints = keyPoints.slice(0, 3).map((p) => parseKeyPoint(p).text);
  const bullCount = watchlist.filter((w) => w.sentiment === '看多').length;
  const bearCount = watchlist.filter((w) => w.sentiment === '看空').length;

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: '已重新排入處理佇列', description: '請稍候，狀態將自動更新' });
    } catch {
      toast({ title: '重試失敗', description: '請稍後再試', variant: 'destructive' });
    } finally {
      setIsRetrying(false);
    }
  }, [episode.id, toast]);

  const handleTickerSearch = useCallback(
    (q: string) => router.push(`/history?q=${encodeURIComponent(q)}`),
    [router],
  );

  const exportMarkdown = useCallback(() => {
    if (!summary) return;
    const md = [
      `# ${episode.title}`,
      `> ${episode.podcast?.title ?? ''}${episode.publishedAt ? ` | ${new Date(episode.publishedAt).toLocaleDateString('zh-TW')}` : ''}`,
      sentiment ? `\n**市場立場：${sentiment}** ${sentimentNote ? `— ${sentimentNote}` : ''}` : '',
      '',
      '## 整體摘要',
      summary.overview,
      ...(keyPoints.length > 0
        ? ['', '## 重點整理', ...keyPoints.map((p, i) => `${i + 1}. ${p}`)]
        : []),
      ...(actionItems.length > 0
        ? ['', '## 行動建議', ...actionItems.map((a) => `- ${a}`)]
        : []),
      ...(watchlist.length > 0
        ? ['', '## 主題/標的觀點', ...watchlist.map((w) =>
            `### ${w.name}${w.ticker ? ` (${w.ticker})` : ''} · ${w.market} · ${w.sentiment} · 風險${w.risk}\n**事件：**${w.event}\n**觀點：**${w.viewpoint}`,
          )]
        : []),
      ...(qa.length > 0
        ? ['', '## Q&A 深度解析', ...qa.map((item, i) =>
            `**Q${i + 1}. ${item.q}**\n${item.points.map((p, j) => `${j + 1}. ${p}`).join('\n')}`,
          )]
        : []),
      ...(quotes.length > 0
        ? ['', '## 金句精選', ...quotes.map((q) => `> ${q}`)]
        : []),
      ...(tags.length > 0
        ? ['', '## 標籤', tags.map((t) => `\`${t}\``).join(' ')]
        : []),
    ].filter(Boolean).join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${episode.title.slice(0, 50).replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [summary, episode, keyPoints, quotes, tags, sentiment, sentimentNote, watchlist, qa, actionItems]);

  const copyFull = useCallback(() => {
    if (!summary) return;
    const full = [
      `【整體摘要】\n${summary.overview}`,
      keyPoints.length > 0
        ? `\n【重點整理】\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
        : '',
      actionItems.length > 0
        ? `\n【行動建議】\n${actionItems.map((a) => `• ${a}`).join('\n')}`
        : '',
      quotes.length > 0
        ? `\n【金句精選】\n${quotes.map((q) => `"${q}"`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n');
    handleCopy(full, 'full');
  }, [summary, keyPoints, quotes, actionItems, handleCopy]);

  const meta = [
    episode.podcast?.title,
    episode.publishedAt
      ? new Date(episode.publishedAt).toLocaleDateString('zh-TW')
      : `建立於 ${formatDateTime(episode.createdAt)}`,
    episode.duration ? formatDuration(episode.duration) : null,
  ].filter(Boolean);

  return (
    <div className="pb-12">
      {/* ── Lede card ───────────────────────────────────────────── */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 py-5 md:px-10 md:py-8">
          <Link
            href="/history"
            className="inline-flex items-center text-[12.5px] font-medium text-primary hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            歷史記錄
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[.16em] text-muted-foreground">
            {episode.podcast?.title && (
              <span className="text-primary normal-case">{episode.podcast.title}</span>
            )}
            {sentiment === '看多' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-success">
                <TrendingUp className="h-3 w-3" />
                看多
              </span>
            )}
            {sentiment === '看空' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-destructive">
                <TrendingDown className="h-3 w-3" />
                看空
              </span>
            )}
            {sentiment === '中性' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-muted-foreground">
                <Minus className="h-3 w-3" />
                中性
              </span>
            )}
          </div>

          <h1 className="mt-3 text-balance text-[22px] font-bold leading-[1.2] tracking-tight md:text-[34px]">
            {episode.title}
          </h1>

          {meta.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
              {meta.map((m, i) => (
                <span key={i}>
                  {i > 0 && <span className="mr-3">·</span>}
                  {m}
                </span>
              ))}
              {watchlist.length > 0 && (
                <span>
                  <span className="mr-3">·</span>
                  {watchlist.length} 標的
                  {bullCount > 0 && <span className="ml-1 text-success">▲{bullCount}</span>}
                  {bearCount > 0 && <span className="ml-1 text-destructive">▼{bearCount}</span>}
                </span>
              )}
            </div>
          )}

          {/* ── Processing banner ────────────────────────────────── */}
          {isProcessing && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-primary">
                  {episode.progressNote ?? (
                    <>
                      {episode.status === EPISODE_STATUS.PENDING && '等待處理中…'}
                      {episode.status === EPISODE_STATUS.TRANSCRIBING && '正在語音轉錄…'}
                      {episode.status === EPISODE_STATUS.SUMMARIZING && '正在生成 AI 摘要…'}
                    </>
                  )}
                </p>
                {isPolling && (
                  <p className="mt-0.5 text-[11.5px] text-primary/70">每 3 秒自動更新</p>
                )}
              </div>
            </div>
          )}

          {/* ── Error banner ─────────────────────────────────────── */}
          {episode.status === EPISODE_STATUS.ERROR && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-destructive">處理失敗</p>
                  {episode.errorMsg && (
                    <p className="mt-1 break-all text-[11.5px] text-destructive/80">
                      {episode.errorMsg}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-3 w-full border-destructive/30 hover:bg-destructive/10"
              >
                <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
                {isRetrying ? '處理中…' : '重新處理'}
              </Button>
            </div>
          )}

          {/* ── Quick-scan ───────────────────────────────────────── */}
          {summary && (sentiment || quickPoints.length > 0) && (
            <div className="mt-5 rounded-xl border border-border bg-gradient-to-br from-primary/[.04] to-transparent p-4">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                速覽
              </div>
              {quickPoints.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {quickPoints.map((text, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px]">
                      <span className="flex-shrink-0 font-bold leading-snug text-primary">▸</span>
                      <span className="leading-snug text-foreground/85">{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {sentimentNote && (
                <p className="mt-2 border-t border-border/50 pt-2 text-[12px] text-muted-foreground">
                  {sentimentNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Body grid ───────────────────────────────────────────── */}
      <div className="mx-auto md:grid md:max-w-5xl md:grid-cols-[1fr_240px] md:gap-10 md:px-10 md:pt-8">
        <div className="min-w-0">
          {summary ? (
            <>
              {/* ── Tab strip ──────────────────────────────────── */}
              <div className="sticky top-[57px] z-10 -mx-0 border-b border-border bg-background/92 backdrop-blur md:top-0 md:rounded-t-xl">
                <div className="flex overflow-x-auto px-5 [scrollbar-width:none] md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                  {tabs.map((t) => {
                    const disabled =
                      (t.id === 'tx' && !hasTranscript) ||
                      (t.count != null && t.count === 0);
                    return (
                      <button
                        key={t.id}
                        onClick={() => !disabled && setTab(t.id)}
                        disabled={disabled}
                        className={cn(
                          'relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-medium transition md:text-[13px]',
                          disabled && 'cursor-not-allowed opacity-40',
                          !disabled && tab === t.id && 'font-semibold text-primary',
                          !disabled && tab !== t.id && 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t.label}
                        {t.count != null && (
                          <span
                            className={cn(
                              'ml-1 font-mono text-[10px]',
                              tab === t.id ? 'text-primary' : 'text-muted-foreground',
                            )}
                          >
                            {t.count}
                          </span>
                        )}
                        {tab === t.id && !disabled && (
                          <span className="absolute inset-x-3.5 bottom-0 h-0.5 rounded bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Tab body ───────────────────────────────────── */}
              <div className="px-5 py-6 md:px-0">
                {/* keypts */}
                {tab === 'keypts' && keyPoints.length > 0 && (
                  <ol className="space-y-6">
                    {keyPoints.map((point, i) => {
                      const { category, text } = parseKeyPoint(point);
                      return (
                        <li
                          key={i}
                          className="grid grid-cols-[40px_1fr] gap-3 md:grid-cols-[60px_1fr] md:gap-5"
                        >
                          <div className="text-right font-mono text-[10px] text-muted-foreground">
                            <div className="text-[15px] font-semibold tracking-tight text-primary md:text-[18px]">
                              {String(i + 1).padStart(2, '0')}
                            </div>
                          </div>
                          <div>
                            {category && <CatBadge category={category} />}
                            <div className="mt-1.5 flex items-start gap-2 group">
                              <TickerText
                                text={text}
                                className="flex-1 text-pretty text-[13.5px] leading-[1.7] text-foreground/85 md:text-[15px]"
                              />
                              <button
                                onClick={() => handleCopy(point, `kp-${i}`)}
                                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                title="複製此重點"
                              >
                                {copiedField === `kp-${i}` ? (
                                  <Check className="h-3 w-3 text-success" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {/* sum */}
                {tab === 'sum' && (
                  <article>
                    <p className="text-[14px] leading-[1.85] text-foreground/85 md:text-[16px] [&::first-letter]:float-left [&::first-letter]:pr-1 [&::first-letter]:text-[2.4em] [&::first-letter]:font-bold [&::first-letter]:leading-none [&::first-letter]:text-primary">
                      <TickerText text={summary.overview} />
                    </p>
                    <button
                      onClick={() => handleCopy(summary.overview, 'overview')}
                      className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === 'overview' ? (
                        <><Check className="h-3.5 w-3.5 text-success" />已複製</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" />複製摘要</>
                      )}
                    </button>
                  </article>
                )}

                {/* wl */}
                {tab === 'wl' && watchlist.length > 0 && (
                  <WatchlistTable items={watchlist} onSearch={handleTickerSearch} />
                )}

                {/* act */}
                {tab === 'act' && actionItems.length > 0 && (
                  <ul className="space-y-3">
                    {actionItems.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                      >
                        <span className="mt-0.5 flex-shrink-0 font-bold text-primary">→</span>
                        <TickerText
                          text={item}
                          className="text-[13.5px] leading-relaxed md:text-[14.5px]"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* qa */}
                {tab === 'qa' && qa.length > 0 && (
                  <div className="divide-y divide-border rounded-xl border border-border bg-card">
                    {qa.map((item, i) => (
                      <div key={i} className="p-4 md:p-5">
                        <QABlock item={item} index={i} />
                      </div>
                    ))}
                  </div>
                )}

                {/* quote */}
                {tab === 'quote' && quotes.length > 0 && (
                  <div className="space-y-3">
                    {quotes.map((quote, i) => (
                      <blockquote
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
                      >
                        <Quote className="mt-1 h-4 w-4 flex-shrink-0 text-primary/60" />
                        <p className="text-[13.5px] italic leading-relaxed text-foreground/80 md:text-[14.5px]">
                          {quote}
                        </p>
                      </blockquote>
                    ))}
                  </div>
                )}

                {/* tx */}
                {tab === 'tx' && hasTranscript && (
                  <section className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                        完整逐字稿
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleCopy(episode.transcript!, 'transcript')}
                        >
                          {copiedField === 'transcript' ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setTranscriptOpen((o) => !o)}
                        >
                          {transcriptOpen ? (
                            <><ChevronUp className="h-3.5 w-3.5" />收合</>
                          ) : (
                            <><ChevronDown className="h-3.5 w-3.5" />展開</>
                          )}
                        </Button>
                      </div>
                    </div>
                    {transcriptOpen && (
                      <div className="px-4 pb-4">
                        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 font-sans text-[13px] leading-7">
                          {episode.transcript}
                        </pre>
                      </div>
                    )}
                  </section>
                )}

                {/* Empty per-tab states */}
                {tab === 'keypts' && keyPoints.length === 0 && <TabEmpty label="重點" />}
                {tab === 'wl' && watchlist.length === 0 && <TabEmpty label="標的觀點" />}
                {tab === 'act' && actionItems.length === 0 && <TabEmpty label="行動建議" />}
                {tab === 'qa' && qa.length === 0 && <TabEmpty label="Q&A" />}
                {tab === 'quote' && quotes.length === 0 && <TabEmpty label="金句" />}
                {tab === 'tx' && !hasTranscript && <TabEmpty label="逐字稿" />}
              </div>

              {/* ── Tags + actions ────────────────────────────── */}
              <div className="space-y-4 px-5 pb-6 md:px-0">
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          router.push(`/history?tag=${encodeURIComponent(tag)}`)
                        }
                        className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-[11.5px] font-medium text-foreground/65 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 text-[13px] font-semibold"
                    onClick={copyFull}
                  >
                    {copiedField === 'full' ? (
                      <><Check className="h-4 w-4 text-success" />已複製！</>
                    ) : (
                      <><Copy className="h-4 w-4" />複製全文</>
                    )}
                  </Button>
                  <Button
                    className="h-11 flex-1 text-[13px] font-semibold"
                    onClick={exportMarkdown}
                  >
                    <Download className="h-4 w-4" />
                    匯出 Markdown
                  </Button>
                </div>
              </div>
            </>
          ) : (
            !isProcessing &&
            episode.status !== EPISODE_STATUS.ERROR && (
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground md:px-0">
                尚未生成摘要。
              </div>
            )
          )}
        </div>

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        {summary && (
          <aside className="hidden md:block">
            <div className="sticky top-6 space-y-4 pt-6">
              {sentiment && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                    市場立場
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {sentiment === '看多' && (
                      <>
                        <TrendingUp className="h-5 w-5 text-success" />
                        <span className="text-[16px] font-semibold text-success">看多</span>
                      </>
                    )}
                    {sentiment === '看空' && (
                      <>
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        <span className="text-[16px] font-semibold text-destructive">看空</span>
                      </>
                    )}
                    {sentiment === '中性' && (
                      <>
                        <Minus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[16px] font-semibold text-muted-foreground">中性</span>
                      </>
                    )}
                  </div>
                  {sentimentNote && (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {sentimentNote}
                    </p>
                  )}
                </div>
              )}

              {watchlist.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                    <span>Watchlist</span>
                    <span>{watchlist.length}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {watchlist.slice(0, 8).map((w, i) => (
                      <li
                        key={`${w.name}-${i}`}
                        className="flex items-center justify-between text-[12.5px]"
                      >
                        <button
                          onClick={() => setTab('wl')}
                          className="font-mono font-semibold hover:text-primary"
                        >
                          {w.ticker || w.name}
                        </button>
                        {w.sentiment === '看多' && <span className="text-success">▲</span>}
                        {w.sentiment === '看空' && <span className="text-destructive">▼</span>}
                        {w.sentiment === '中性' && <span className="text-muted-foreground">—</span>}
                        {w.sentiment === '觀望' && <span className="text-warning">…</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                  目錄
                </div>
                <ul className="mt-2 space-y-1 text-[12.5px]">
                  {tabs.map((t) => {
                    const disabled =
                      (t.id === 'tx' && !hasTranscript) ||
                      (t.count != null && t.count === 0);
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => !disabled && setTab(t.id)}
                          disabled={disabled}
                          className={cn(
                            'flex w-full items-center justify-between rounded px-2 py-1',
                            disabled && 'cursor-not-allowed opacity-40',
                            !disabled && tab === t.id && 'bg-primary/10 font-semibold text-primary',
                            !disabled && tab !== t.id && 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {t.label}
                          {t.count != null && (
                            <span className="font-mono text-[10px] opacity-70">{t.count}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TabEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-muted-foreground">
      <div className="font-mono text-[11px] uppercase tracking-widest">{label}</div>
      <div className="mt-2">本集尚無內容</div>
    </div>
  );
}
