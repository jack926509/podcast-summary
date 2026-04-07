import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Podcast 摘要系統',
  description: '個人 Podcast 內容摘要與記錄系統',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="font-sans antialiased">
        <AppShell>
          {children}
        </AppShell>
        <Toaster />
      </body>
    </html>
  );
}
