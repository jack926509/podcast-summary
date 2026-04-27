'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, LayoutDashboard, History, Bell, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';

const TABS = [
  { href: '/', label: '首頁', icon: LayoutDashboard, exact: true },
  { href: '/history', label: '內容', icon: History },
  { href: '/subscriptions', label: '訂閱', icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-muted/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
            <Headphones className="h-3.5 w-3.5" />
          </div>
          <div className="text-[15px] font-semibold tracking-tight">
            Podcast 摘要
          </div>
        </Link>
      </header>

      {/* Main content area — leave space for desktop sidebar + mobile bottom tab */}
      <main className="pb-24 md:pb-6 md:pl-60">{children}</main>

      {/* Mobile bottom tab bar with center FAB */}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl md:hidden',
          'pb-[max(env(safe-area-inset-bottom),12px)]',
        )}
      >
        <div className="grid grid-cols-[1fr_1fr_auto_1fr] items-start gap-1 px-3 pt-2">
          <TabItem
            href={TABS[0].href}
            label={TABS[0].label}
            Icon={TABS[0].icon}
            active={isActive(TABS[0].href, TABS[0].exact)}
          />
          <TabItem
            href={TABS[1].href}
            label={TABS[1].label}
            Icon={TABS[1].icon}
            active={isActive(TABS[1].href, TABS[1].exact)}
          />
          <Link
            href="/new"
            aria-label="新增任務"
            className="-mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </Link>
          <TabItem
            href={TABS[2].href}
            label={TABS[2].label}
            Icon={TABS[2].icon}
            active={isActive(TABS[2].href, TABS[2].exact)}
          />
        </div>
      </nav>
    </div>
  );
}

function TabItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-0.5 py-1 text-[10.5px] font-medium',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
