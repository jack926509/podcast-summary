'use client';

import { useEffect } from 'react';

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
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem 0', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem' }}>⚠️</p>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>載入歷史記錄失敗</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>請稍後再試，或重新整理頁面。</p>
        </div>
        <button
          onClick={reset}
          style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          重試
        </button>
      </div>
    </div>
  );
}
