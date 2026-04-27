'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

interface UploadFormProps {
  onSuccess: (episodeId: string) => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const maxMB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [summaryMode, setSummaryMode] = useState<'brief' | 'standard' | 'deep'>('standard');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('audio/')) {
      setError('請選擇音訊檔案 (mp3, wav, m4a 等)');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`檔案大小超過上限（${maxMB} MB），請選擇較小的檔案`);
      return;
    }
    setFile(f);
    setError(null);
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name.replace(/\.[^.]+$/, ''));
    formData.append('summaryMode', summaryMode);

    // Use XMLHttpRequest for upload progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 202) {
          const data = JSON.parse(xhr.responseText);
          onSuccess(data.episodeId);
          resolve();
        } else {
          let msg = '上傳失敗';
          try {
            msg = JSON.parse(xhr.responseText).error ?? msg;
          } catch {}
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('網路連線錯誤')));

      xhr.open('POST', '/api/episodes/upload');
      xhr.send(formData);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : '上傳失敗');
    });

    setIsUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'relative cursor-pointer rounded-2xl border-[1.5px] border-dashed bg-primary/[.04] px-6 py-10 text-center transition-colors md:py-14',
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-primary/40 hover:border-primary/60',
          file && 'border-primary/60 bg-primary/[.06]',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary md:h-16 md:w-16">
              <FileAudio className="h-7 w-7" />
            </div>
            <p className="mt-2 text-[15px] font-bold tracking-tight md:text-[16px]">{file.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
            >
              <X className="h-4 w-4 mr-1" /> 移除
            </Button>
          </div>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary md:h-16 md:w-16">
              <Upload className="h-7 w-7" />
            </div>
            <p className="mt-3 text-[15px] font-bold tracking-tight md:mt-4 md:text-[18px]">
              點此選擇音檔
              <span className="hidden md:inline"> 或拖放至此</span>
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground md:text-[13px]">
              MP3 · WAV · M4A · OGG · 最大 {maxMB} MB
            </p>
          </>
        )}
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
        <span className="font-bold not-italic text-primary">ⓘ</span>
        <div>音檔超過 25 MB 會自動分段轉錄，整段約需 2–5 分鐘。處理期間可關閉視窗，完成後會在 Dashboard 顯示。</div>
      </div>

      {/* Title input */}
      <div className="space-y-2">
        <Label htmlFor="ep-title">集數標題</Label>
        <Input
          id="ep-title"
          placeholder="輸入集數標題（選填）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Summary mode */}
      <div className="space-y-1.5">
        <Label className="text-xs">摘要深度</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { value: 'brief', label: '快速', desc: '3 重點 · 省成本' },
            { value: 'standard', label: '標準', desc: '6-10 重點' },
            { value: 'deep', label: '深度', desc: '10-15 重點' },
          ] as const).map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSummaryMode(value)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                summaryMode === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>上傳中...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!file || isUploading}
        className="h-11 w-full text-[14px] font-semibold"
      >
        {isUploading ? '上傳中...' : '開始處理 →'}
      </Button>
    </form>
  );
}
