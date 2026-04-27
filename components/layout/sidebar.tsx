'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Bell, PlusCircle, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: '首頁', icon: LayoutDashboard, exact: true },
  { href: '/history', label: '內容', icon: History },
  { href: '/subscriptions', label: '訂閱', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-border bg-muted/40 p-4 backdrop-blur md:flex">
      <Link
        href="/"
        className="mb-2 flex items-center gap-2 border-b border-border px-2 pb-4"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Headphones className="h-4 w-4" />
        </div>
        <div className="font-semibold tracking-tight">Podcast 摘要</div>
      </Link>

      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:bg-background',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}

      <Link
        href="/new"
        className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
      >
        <PlusCircle className="h-4 w-4" />
        新增任務
      </Link>

      <div className="mt-auto px-2 pt-4">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          個人 Podcast 摘要系統
        </p>
      </div>
    </aside>
  );
}
