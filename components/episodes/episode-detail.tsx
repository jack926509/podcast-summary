'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Quote, Tag, Loader2, AlertCircle } from 'lucide-react';
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {episode.status === EPISODE_STATUS.PENDING && '等待處理中...'}
                {episode.status === EPISODE_STATUS.TRANSCRIBING && '正在進行語音轉錄，請稍候...'}
                {episode.status === EPISODE_STATUS.SUMMARIZING && '正在生成 AI 摘要，請稍候...'}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {isPolling ? '每 3 秒自動更新狀態' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {episode.status === EPISODE_STATUS.ERROR && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">處理失敗</p>
              {episode.errorMsg && (
                <p className="text-xs text-red-600 mt-0.5">{episode.errorMsg}</p>
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
            <CardHeader>
              <CardTitle className="text-base">整體摘要</CardTitle>
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
        </>
      )}

      {/* Transcript (collapsible) */}
      {episode.transcript && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">完整逐字稿</CardTitle>
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
