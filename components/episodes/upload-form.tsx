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
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          file && 'border-primary/50 bg-primary/5',
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
            <FileAudio className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
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
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">拖放音檔或點擊選擇</p>
            <p className="text-xs text-muted-foreground">支援 MP3、WAV、M4A 等格式・最大 {maxMB} MB</p>
          </div>
        )}
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
        className="w-full"
      >
        {isUploading ? '上傳中...' : '開始處理'}
      </Button>
    </form>
  );
}
