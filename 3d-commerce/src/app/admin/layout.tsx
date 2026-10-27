"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconChartBar,
  IconChevronRight,
  IconLayoutDashboard,
  IconLogout,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconShoppingBag,
  IconSearch,
  IconMessageCircle,
  IconRotate2,
  IconTags,
  IconUsers,
  IconX,
  IconCategory,
  IconClipboardList,
  IconHistory,
  IconBox,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type AdminUser = { id: string; name: string | null; email: string; role: string };

const nav = [
  { href: "/admin", label: "Overview", icon: IconLayoutDashboard },
  { href: "/admin/products", label: "Catalog", icon: IconPackage },
  { href: "/admin/catalog-tools", label: "Catalog operations", icon: IconClipboardList },
  { href: "/admin/categories", label: "Categories", icon: IconCategory },
  { href: "/admin/custom-products", label: "Custom products", icon: IconCategory },
  { href: "/admin/orders", label: "Orders", icon: IconShoppingBag },
  { href: "/admin/custom-requests", label: "Custom requests", icon: IconChartBar },
  { href: "/admin/customers", label: "Customers", icon: IconUsers },
  { href: "/admin/shipping", label: "Shipping & delivery", icon: IconMapPin },
  { href: "/admin/settings", label: "Store controls", icon: IconSettings },
  { href: "/admin/seo", label: "Product SEO", icon: IconSearch },
  { href: "/admin/reviews", label: "Reviews", icon: IconMessageCircle },
  { href: "/admin/returns", label: "Returns", icon: IconRotate2 },
  { href: "/admin/commerce", label: "Promotions & tax", icon: IconTags },
  { href: "/admin/3d-conversion", label: "3D Conversion", icon: IconBox },
  { href: "/admin/audit", label: "Audit log", icon: IconHistory },
  { href: "/admin/analytics", label: "Analytics", icon: IconChartBar },
  { href: "/admin/notifications", label: "Notifications", icon: IconMessageCircle },
];

type SessionOutcome =
  | { result: "authenticated"; user: AdminUser }
  | { result: "unauthenticated" }
  | { result: "unavailable" };

// Re-verify the session at most this often while navigating inside the admin.
const SESSION_RECHECK_MS = 5 * 60 * 1000;

// Only an explicit "not signed in" answer may send the admin to the login page.
// Network blips, 5xx and rate-limit responses are retried and, if they persist,
// reported as "unavailable" instead of looking like a logout.
async function checkAdminSession(): Promise<SessionOutcome> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("/api/auth/admin/session", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json().catch(() => null)) as {
          user?: AdminUser | null;
        } | null;
        return data?.user
          ? { result: "authenticated", user: data.user }
          : { result: "unauthenticated" };
      }
      if (response.status === 401 || response.status === 403) {
        return { result: "unauthenticated" };
      }
    } catch {
      // Network blip: retry below.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
  }
  return { result: "unavailable" };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "unavailable">("checking");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);
  const lastVerifiedAt = useRef(0);
  const isLogin = pathname === "/admin/login";

  const verify = useCallback(async () => {
    setStatus("checking");
    const outcome = await checkAdminSession();
    if (outcome.result === "authenticated") {
      lastVerifiedAt.current = Date.now();
      setUser(outcome.user);
    } else if (outcome.result === "unauthenticated") {
      lastVerifiedAt.current = 0;
      setUser(null);
      router.replace("/admin/login");
    } else {
      // Keep an already-loaded workspace usable; only block when nothing is loaded yet.
      setStatus("unavailable");
    }
  }, [router]);

  useEffect(() => {
    if (isLogin) return;
    if (user && Date.now() - lastVerifiedAt.current < SESSION_RECHECK_MS) return;
    void verify();
  }, [isLogin, pathname, user, verify]);

  const activeLabel =
    nav.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    )?.label ?? "Admin";

  const logout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    lastVerifiedAt.current = 0;
    setUser(null);
    router.replace("/admin/login");
  };

  if (isLogin) {
    return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  }

  if (!user && status === "unavailable") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <p className="text-sm font-medium">The admin service is not responding.</p>
        <p className="max-w-sm text-xs text-muted">
          You are still signed in. This is usually a temporary connection problem.
        </p>
        <Button type="button" size="sm" onClick={() => void verify()}>
          Try again
        </Button>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-xs text-muted">
        Loading admin workspace…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-screen w-full bg-background">
        <aside
          className={
            open
              ? "fixed inset-y-0 left-0 z-50 flex w-[292px] shrink-0 flex-col border-r border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none"
              : "fixed inset-y-0 left-0 z-50 flex w-[292px] shrink-0 -translate-x-full flex-col border-r border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none"
          }
        >
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href="/admin" className="min-w-0" onClick={() => setOpen(false)}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-primary">
                  Voxel3D / ADMIN
                </p>
                <p className="mt-1 text-base font-semibold tracking-[-0.02em]">Operations</p>
              </Link>
              <IconButton
                label="Close navigation"
                onClick={() => setOpen(false)}
                className="lg:hidden"
              >
                <IconX size={17} />
              </IconButton>
            </div>
          </div>

          <div className="mt-5 px-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
              Workspace
            </p>
          </div>

          <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-1 pb-4 [scrollbar-width:thin]">
            {nav.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={
                    active
                      ? "group flex min-h-10 items-center justify-between rounded-xl border border-primary/15 bg-primary/[0.09] px-3.5 py-2.5 text-xs font-medium text-primary shadow-sm"
                      : "group flex min-h-10 items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs text-muted transition-colors hover:border-border hover:bg-background hover:text-foreground"
                  }
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        active
                          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground group-hover:text-foreground"
                      }
                    >
                      <Icon size={16} stroke={1.7} />
                    </span>
                    <span className="truncate">{label}</span>
                  </span>
                  <IconChevronRight
                    size={14}
                    className={active ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-50"}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 space-y-3 border-t border-border pt-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                Signed in
              </p>
              <p className="mt-1 truncate text-xs font-medium">{user.name || "Administrator"}</p>
              <p className="mt-1 truncate text-[10px] text-muted">{user.email}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              className="w-full justify-center"
            >
              <IconLogout size={16} />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <IconButton
                  label="Open navigation"
                  onClick={() => setOpen(true)}
                  className="lg:hidden"
                >
                  <span className="block h-4 w-4 border-y border-foreground/70" />
                </IconButton>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted">
                    Admin workspace
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium">{activeLabel}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <ThemeToggle />
                <Button href="/shop" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  View storefront ↗
                </Button>
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
