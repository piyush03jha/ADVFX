"use client";

import { useEffect, useMemo, useState } from "react";
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
  IconCpu,
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
  { href: "/admin/processing", label: "3D processing", icon: IconCpu },
  { href: "/admin/audit", label: "Audit log", icon: IconHistory },
  { href: "/admin/analytics", label: "Analytics", icon: IconChartBar },
  { href: "/admin/notifications", label: "Notifications", icon: IconMessageCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    fetch("/api/auth/admin/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (d.user) setUser(d.user);
        else router.replace("/admin/login");
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const activeLabel =
    nav.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    )?.label ?? "Admin";

  const logout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-xs text-muted">
        Loading admin workspace…
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px] bg-background">
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
