'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, History, X, Bell, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/new', label: '新增任務', icon: PlusCircle },
  { href: '/subscriptions', label: '我的訂閱', icon: Bell },
  { href: '/history', label: '歷史記錄', icon: History },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col bg-sidebar dark:bg-sidebar border-r border-border/60">
      {/* Logo */}
      <div className="flex h-[60px] items-center gap-2.5 px-5 border-b border-border/60">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
          <Headphones className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-sm tracking-tight flex-1 text-foreground">
          Podcast 摘要
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 md:hidden text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-background/80 dark:bg-muted/60 text-foreground font-semibold shadow-sm'
                  : 'text-foreground/60 font-medium hover:bg-background/50 dark:hover:bg-muted/30 hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-foreground/40',
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 px-5 py-4">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          個人 Podcast 摘要系統
        </p>
      </div>
    </aside>
  );
}
