"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconCreditCard,
  IconHome,
  IconMapPin,
  IconPackage,
  IconSettings,
} from "@tabler/icons-react";

const links = [
  {
    label: "Overview",
    href: "/account",
    icon: IconHome,
  },
  {
    label: "Orders",
    href: "/account/orders",
    icon: IconPackage,
  },
  {
    label: "Addresses",
    href: "/account/addresses",
    icon: IconMapPin,
  },
  {
    label: "Payments",
    href: "/account/payments",
    icon: IconCreditCard,
  },
  {
    label: "Settings",
    href: "/account/settings",
    icon: IconSettings,
  },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <p className="px-3 pb-2 pt-2 text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
            Account
          </p>

          <div className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href ||
                (link.href !== "/account" &&
                  pathname.startsWith(`${link.href}/`));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all ${
                    active
                      ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                      : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} stroke={1.7} />
                    {link.label}
                  </span>
                  <span
                    className={`h-1 w-1 rounded-full transition-opacity ${
                      active ? "bg-primary opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== "/account" &&
                pathname.startsWith(`${link.href}/`));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted"
                }`}
              >
                <Icon size={13} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
