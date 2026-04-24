'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Quote, Tag, Loader2, AlertCircle,
  Copy, Check, RefreshCw, Download, BookOpen, Lightbulb, Sparkles,
  TrendingUp, TrendingDown, Minus, BarChart2, HelpCircle, Zap, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { useEpisodePolling } from '@/hooks/use-episode-polling';
import { useToast } from '@/hooks/use-toast';
import { parseJsonField, formatDateTime, formatDuration, parseTickerSegments } from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import type { EpisodeWithRelations, QAItem, WatchlistItem } from '@/lib/types';

interface EpisodeDetailProps {
  initialEpisode: EpisodeWithRelations;
}

/** Parse optional 【Category】 prefix from a keyPoint string */
function parseKeyPoint(point: string): { category: string | null; text: string } {
  const m = point.match(/^【(.+?)】(.+)$/);
  if (m) return { category: m[1], text: m[2].trim() };
  return { category: null, text: point };
}

const CATEGORY_COLORS: Record<string, string> = {
  '市場觀點': 'bg-primary/10 text-primary',
  '投資策略': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  '數據':     'bg-warning/10 text-warning',
  '趨勢':     'bg-success/10 text-success',
  '風險提示': 'bg-destructive/10 text-destructive',
  '概念解析': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  '產業動態': 'bg-success/10 text-success',
  '操作建議': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${cls}`}>
      {category}
    </span>
  );
}

/** Sentiment badge for overall market stance */
function SentimentBadge({ sentiment, note }: { sentiment: string; note?: string | null }) {
  const config = {
    '看多': { icon: TrendingUp, cls: 'bg-success/10 text-success border-success/20' },
    '看空': { icon: TrendingDown, cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    '中性': { icon: Minus, cls: 'bg-muted text-muted-foreground border-border' },
  }[sentiment] ?? { icon: Minus, cls: 'bg-muted text-muted-foreground border-border' };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.cls}`}
      title={note ?? undefined}
    >
      <Icon className="h-3 w-3" />
      {sentiment}
    </span>
  );
}

/** Watchlist card for a single stock/company */
function WatchlistCard({ item, onSearch }: { item: WatchlistItem; onSearch?: (q: string) => void }) {
  const sentimentCfg = {
    '看多': { cls: 'text-success bg-success/10', icon: TrendingUp },
    '看空': { cls: 'text-destructive bg-destructive/10', icon: TrendingDown },
    '中性': { cls: 'text-muted-foreground bg-muted', icon: Minus },
    '觀望': { cls: 'text-warning bg-warning/10', icon: Minus },
  }[item.sentiment] ?? { cls: 'text-muted-foreground bg-muted', icon: Minus };
  const riskCls = { '高': 'text-destructive', '中': 'text-warning', '低': 'text-success' }[item.risk] ?? 'text-muted-foreground';
  const SentIcon = sentimentCfg.icon;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onSearch?.(item.name)}
              className="font-semibold text-sm hover:text-primary hover:underline decoration-primary/50 text-left"
              title={`搜尋「${item.name}」的相關集數`}
            >
              {item.name}
            </button>
            {item.ticker && (
              <button
                onClick={() => onSearch?.(item.ticker!)}
                className="bg-warning/20 text-warning-foreground font-mono text-xs font-semibold rounded px-1 hover:bg-warning/40 transition-colors"
                title={`搜尋「${item.ticker}」的相關集數`}
              >
                {item.ticker}
              </button>
            )}
            <span className="text-[11px] text-muted-foreground">{item.market}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${sentimentCfg.cls}`}>
            <SentIcon className="h-3 w-3" />
            {item.sentiment}
          </span>
          <span className={`text-[11px] font-medium ${riskCls}`}>風險：{item.risk}</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">事件</p>
          <TickerText text={item.event} className="text-sm leading-relaxed" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">觀點</p>
          <TickerText text={item.viewpoint} className="text-sm leading-relaxed text-foreground/80" />
        </div>
      </div>
    </div>
  );
}

/** Q&A section for a single Q&A item */
function QACard({ item, index }: { item: QAItem; index: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <span className="flex-shrink-0 text-xs font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center mt-0.5">
          Q
        </span>
        <p className="text-sm font-medium leading-snug">{item.q}</p>
      </div>
      <ul className="ml-7 space-y-1.5">
        {item.points.map((point, j) => (
          <li key={j} className="flex gap-2 items-start">
            <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground mt-1">{index + 1}.{j + 1}</span>
            <TickerText text={point} className="text-sm leading-relaxed text-foreground/85" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Render text with stock tickers highlighted */
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
            className="bg-warning/20 text-warning-foreground font-semibold rounded px-0.5 not-italic"
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

export function EpisodeDetail({ initialEpisode }: EpisodeDetailProps) {
  const { episode, isPolling } = useEpisodePolling(initialEpisode);
  const { toast } = useToast();
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const summary = episode.summary;
  // Prisma includes all DB columns in the summary object — cast once for new fields
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

  // Quick-scan data
  const quickPoints = keyPoints.slice(0, 3);
  const bullCount = watchlist.filter((w) => w.sentiment === '看多').length;
  const bearCount = watchlist.filter((w) => w.sentiment === '看空').length;

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
            `### ${w.name}${w.ticker ? ` (${w.ticker})` : ''} · ${w.market} · ${w.sentiment} · 風險${w.risk}\n**事件：**${w.event}\n**觀點：**${w.viewpoint}`
          )]
        : []),
      ...(qa.length > 0
        ? ['', '## Q&A 深度解析', ...qa.map((item, i) =>
            `**Q${i + 1}. ${item.q}**\n${item.points.map((p, j) => `${j + 1}. ${p}`).join('\n')}`
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

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">{episode.title}</h1>
          <StatusBadge status={episode.status} className="flex-shrink-0 mt-0.5" />
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          <span>{episode.podcast?.title}</span>
          {episode.duration && <span>{formatDuration(episode.duration)}</span>}
          <span>建立於 {formatDateTime(episode.createdAt)}</span>
        </div>
      </div>

      {/* ── Processing ─────────────────────────────────────────── */}
      {isProcessing && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">
              {episode.status === EPISODE_STATUS.PENDING && '等待處理中...'}
              {episode.status === EPISODE_STATUS.TRANSCRIBING && '正在語音轉錄...'}
              {episode.status === EPISODE_STATUS.SUMMARIZING && '正在生成 AI 摘要...'}
            </p>
            {isPolling && (
              <p className="text-xs text-primary/70 mt-0.5">每 3 秒自動更新</p>
            )}
          </div>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────── */}
      {episode.status === EPISODE_STATUS.ERROR && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">處理失敗</p>
              {episode.errorMsg && (
                <p className="text-xs text-destructive/80 mt-1 break-all">{episode.errorMsg}</p>
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
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? '處理中...' : '重新處理'}
          </Button>
        </div>
      )}

      {/* ── Summary ────────────────────────────────────────────── */}
      {summary && (
        <>
          {/* Quick-scan card */}
          {(sentiment || quickPoints.length > 0) && (
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  速覽
                </h2>
                {sentiment && <SentimentBadge sentiment={sentiment} note={sentimentNote} />}
              </div>
              {quickPoints.length > 0 && (
                <ul className="space-y-1.5">
                  {quickPoints.map((point, i) => {
                    const { text } = parseKeyPoint(point);
                    return (
                      <li key={i} className="flex gap-2 items-start text-sm">
                        <span className="flex-shrink-0 font-bold text-primary leading-snug">▸</span>
                        <span className="leading-snug text-foreground/85">{text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {(sentimentNote || watchlist.length > 0) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50 flex-wrap">
                  {sentimentNote && <span>{sentimentNote}</span>}
                  {watchlist.length > 0 && (
                    <span className="flex items-center gap-2 ml-auto">
                      <span>標的 {watchlist.length} 檔</span>
                      {bullCount > 0 && <span className="text-success font-medium">看多 {bullCount}</span>}
                      {bearCount > 0 && <span className="text-destructive font-medium">看空 {bearCount}</span>}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Overview */}
          <section className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                整體摘要
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(summary.overview, 'overview')}
              >
                {copiedField === 'overview' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="px-4 pb-4">
              <TickerText
                text={summary.overview}
                className="text-sm leading-7 whitespace-pre-wrap text-foreground/90"
              />
            </div>
          </section>

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <section className="rounded-lg border bg-card">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  重點整理
                </h2>
              </div>
              <ul className="px-4 pb-4 space-y-3">
                {keyPoints.map((point, i) => {
                  const { category, text } = parseKeyPoint(point);
                  return (
                    <li key={i} className="flex gap-2 items-start group">
                      <span className="flex-shrink-0 text-xs font-bold text-primary/60 mt-0.5 w-5 text-right">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        {category && (
                          <div className="mb-1">
                            <CategoryBadge category={category} />
                          </div>
                        )}
                        <TickerText text={text} className="text-sm leading-relaxed" />
                      </div>
                      <button
                        onClick={() => handleCopy(point, `kp-${i}`)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground mt-0.5"
                        title="複製此重點"
                      >
                        {copiedField === `kp-${i}` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <section className="rounded-lg border bg-card">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                  行動建議
                </h2>
              </div>
              <ul className="px-4 pb-4 space-y-2">
                {actionItems.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 text-primary font-bold leading-snug mt-0.5">→</span>
                    <TickerText text={item} className="text-sm leading-relaxed" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5 px-0.5">
                <BarChart2 className="h-4 w-4 text-primary" />
                主題/標的觀點
              </h2>
              <div className="space-y-2">
                {watchlist.map((item, i) => (
                  <WatchlistCard key={i} item={item} onSearch={handleTickerSearch} />
                ))}
              </div>
            </section>
          )}

          {/* Q&A */}
          {qa.length > 0 && (
            <section className="rounded-lg border bg-card">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Q&A 深度解析
                </h2>
              </div>
              <div className="px-4 pb-4 space-y-5 divide-y">
                {qa.map((item, i) => (
                  <div key={i} className={i > 0 ? 'pt-4' : ''}>
                    <QACard item={item} index={i} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quotes */}
          {quotes.length > 0 && (
            <section className="rounded-lg border bg-card">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Quote className="h-4 w-4 text-primary" />
                  金句精選
                </h2>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="border-l-[3px] border-primary/40 pl-3 py-0.5"
                  >
                    <p className="text-sm leading-relaxed text-foreground/80 italic">{quote}</p>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/history?tag=${encodeURIComponent(tag)}`)}
                    className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={copyFull}>
              {copiedField === 'full' ? (
                <><Check className="h-4 w-4 mr-2 text-green-600" />已複製！</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" />複製全文摘要</>
              )}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={exportMarkdown}>
              <Download className="h-4 w-4 mr-2" />
              匯出 Markdown
            </Button>
          </div>
        </>
      )}

      {/* ── Transcript ─────────────────────────────────────────── */}
      {episode.transcript && (
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              完整逐字稿
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(episode.transcript!, 'transcript')}
              >
                {copiedField === 'transcript' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setTranscriptOpen((o) => !o)}
              >
                {transcriptOpen ? (
                  <><ChevronUp className="h-3.5 w-3.5 mr-1" />收合</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5 mr-1" />展開</>
                )}
              </Button>
            </div>
          </div>
          {transcriptOpen && (
            <div className="px-4 pb-4">
              <pre className="text-sm leading-7 whitespace-pre-wrap font-sans max-h-[60vh] overflow-y-auto rounded-md bg-muted/40 p-4">
                {episode.transcript}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
