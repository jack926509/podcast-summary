// app/(main)/layout.tsx
import { AppShell } from "@/components/podcast/app-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
