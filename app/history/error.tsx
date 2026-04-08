'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold mb-1">載入歷史記錄失敗</h2>
          <p className="text-sm text-muted-foreground">請稍後再試，或重新整理頁面。</p>
        </div>
        <Button onClick={reset} variant="outline" size="sm">重試</Button>
      </div>
    </div>
  );
}
