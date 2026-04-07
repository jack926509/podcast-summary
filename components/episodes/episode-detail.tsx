'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Quote, Tag, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { useEpisodePolling } from '@/hooks/use-episode-polling';
import { parseJsonField, formatDateTime, formatDuration } from '@/lib/utils';
import { EPISODE_STATUS, PROCESSING_STATUSES } from '@/lib/constants';
import type { EpisodeWithRelations } from '@/lib/types';

interface EpisodeDetailProps {
  initialEpisode: EpisodeWithRelations;
}

export function EpisodeDetail({ initialEpisode }: EpisodeDetailProps) {
  const { episode, isPolling } = useEpisodePolling(initialEpisode);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const summary = episode.summary;
  const keyPoints = parseJsonField<string[]>(summary?.keyPoints, []);
  const quotes = parseJsonField<string[]>(summary?.quotes, []);
  const tags = parseJsonField<string[]>(summary?.tags ?? null, []);

  const isProcessing = (PROCESSING_STATUSES as string[]).includes(episode.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">{episode.title}</h1>
          <StatusBadge status={episode.status} className="flex-shrink-0 mt-1" />
        </div>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>{episode.podcast?.title}</span>
          {episode.duration && <span>{formatDuration(episode.duration)}</span>}
          <span>建立於 {formatDateTime(episode.createdAt)}</span>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">
                {episode.status === EPISODE_STATUS.PENDING && '等待處理中...'}
                {episode.status === EPISODE_STATUS.TRANSCRIBING && '正在進行語音轉錄，請稍候...'}
                {episode.status === EPISODE_STATUS.SUMMARIZING && '正在生成 AI 摘要，請稍候...'}
              </p>
              {isPolling && (
                <p className="text-xs text-primary/70 mt-0.5">每 3 秒自動更新狀態</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {episode.status === EPISODE_STATUS.ERROR && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">處理失敗</p>
              {episode.errorMsg && (
                <p className="text-xs text-destructive/80 mt-0.5">{episode.errorMsg}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary content */}
      {summary && (
        <>
          {/* Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">整體摘要</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleCopy(summary.overview, 'overview')}
              >
                {copiedField === 'overview' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {summary.overview}
              </p>
            </CardContent>
          </Card>

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">重點整理</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="flex-shrink-0 font-medium text-primary">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quotes */}
          {quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Quote className="h-4 w-4" />
                  金句精選
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quotes.map((quote, i) => (
                    <blockquote
                      key={i}
                      className="border-l-4 border-primary pl-4 py-1"
                    >
                      <p className="text-sm italic leading-relaxed">{quote}</p>
                    </blockquote>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Copy full summary */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const full = [
                  `【整體摘要】\n${summary.overview}`,
                  keyPoints.length > 0
                    ? `\n【重點整理】\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
                    : '',
                  quotes.length > 0
                    ? `\n【金句精選】\n${quotes.map((q) => `"${q}"`).join('\n')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n');
                handleCopy(full, 'full');
              }}
            >
              {copiedField === 'full' ? (
                <Check className="h-4 w-4 mr-2 text-success" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedField === 'full' ? '已複製！' : '複製全文摘要'}
            </Button>
          </div>
        </>
      )}

      {/* Transcript (collapsible) */}
      {episode.transcript && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">完整逐字稿</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleCopy(episode.transcript!, 'transcript')}
                >
                  {copiedField === 'transcript' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTranscriptOpen((o) => !o)}
                >
                  {transcriptOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" /> 收合
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" /> 展開
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {transcriptOpen && (
            <CardContent>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto rounded bg-muted/30 p-4">
                {episode.transcript}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
