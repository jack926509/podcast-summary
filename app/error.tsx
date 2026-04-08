'use client';

import { useEffect } from 'react';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '2rem' }}>⚠️</p>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>發生錯誤</h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>頁面載入時發生問題，請嘗試重新載入。</p>
      </div>
      <button
        onClick={reset}
        style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
      >
        重新載入
      </button>
    </div>
  );
}
