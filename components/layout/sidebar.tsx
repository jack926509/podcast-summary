'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, History, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/new', label: '新增任務', icon: PlusCircle },
  { href: '/history', label: '歷史記錄', icon: History },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Mic className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm flex-1">Podcast 摘要</span>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground px-3">個人 Podcast 摘要系統</p>
      </div>
    </aside>
  );
}
