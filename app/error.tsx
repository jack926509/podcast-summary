'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div>
        <h2 className="text-xl font-semibold mb-1">發生錯誤</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          頁面載入時發生問題，請嘗試重新載入。
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        重新載入
      </Button>
    </div>
  );
}
