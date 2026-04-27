// components/podcast/app-shell.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "home",    label: "首頁", icon: "▦", href: "/" },
  { id: "history", label: "歷史", icon: "⊕", href: "/history" },
  { id: "subs",    label: "訂閱", icon: "♡", href: "/subscriptions" },
  { id: "more",    label: "更多", icon: "≡", href: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* DESKTOP — sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-border bg-muted/40 p-4 backdrop-blur md:flex">
        <Link href="/" className="mb-2 flex items-center gap-2 border-b border-border px-2 pb-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">🎧</div>
          <div className="font-semibold tracking-tight">Podcast 摘要</div>
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              isActive(n.href)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:bg-background"
            )}
          >
            <span className="w-5 text-center">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <Link
          href="/new"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
        >
          <span>+</span>新增任務
        </Link>
      </aside>

      {/* MOBILE — top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-muted/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">🎧</div>
          <div className="text-[15px] font-semibold tracking-tight">Podcast 摘要</div>
        </Link>
        <button className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-background" aria-label="搜尋">⌕</button>
      </header>

      <main className="pb-24 md:pb-6 md:pl-60">{children}</main>

      {/* MOBILE — bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <div className="flex items-start justify-around px-3 pt-2">
          <TabItem n={NAV[0]} active={isActive(NAV[0].href)} />
          <TabItem n={NAV[1]} active={isActive(NAV[1].href)} />
          <Link
            href="/new"
            className="-mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-2xl font-light text-primary-foreground shadow-lg shadow-primary/30"
          >
            +
          </Link>
          <TabItem n={NAV[2]} active={isActive(NAV[2].href)} />
          <TabItem n={NAV[3]} active={isActive(NAV[3].href)} />
        </div>
      </nav>
    </div>
  );
}

function TabItem({ n, active }: { n: (typeof NAV)[number]; active: boolean }) {
  return (
    <Link
      href={n.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <span className="text-lg leading-none">{n.icon}</span>
      {n.label}
    </Link>
  );
}
