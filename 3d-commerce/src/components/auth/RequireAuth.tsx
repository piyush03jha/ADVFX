"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.05),hsl(var(--background)/0.02)_60%,hsl(var(--primary)/0.06))] px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border border-white/10 border-t-primary" />
          <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-muted">Checking session</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
