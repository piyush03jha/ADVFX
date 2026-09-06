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
  { label: "Overview", href: "/account", icon: IconHome },
  { label: "Orders", href: "/account/orders", icon: IconPackage },
  { label: "Addresses", href: "/account/addresses", icon: IconMapPin },
  { label: "Payments", href: "/account/payments", icon: IconCreditCard },
  { label: "Settings", href: "/account/settings", icon: IconSettings },
];

const cardGradient = "bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.09))]";

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden lg:block">
        <div className={`sticky top-24 overflow-hidden rounded-2xl border border-white/[0.1] ${cardGradient} p-1.5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.18)]`}>
          <div className="px-3 pb-2 pt-2.5">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted">Your account</p>
          </div>

          <div className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href || (link.href !== "/account" && pathname.startsWith(`${link.href}/`));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-xs transition-all ${
                    active
                      ? "bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--primary)/0.06)_60%,hsl(var(--foreground)/0.04))] text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                      : "bg-[linear-gradient(135deg,hsl(var(--foreground)/0.025),transparent_65%,hsl(var(--primary)/0.025))] text-muted hover:bg-[linear-gradient(135deg,hsl(var(--foreground)/0.055),hsl(var(--primary)/0.05))] hover:text-foreground"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${active ? "border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--primary)/0.04))]" : "border-white/[0.07] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.035),hsl(var(--primary)/0.025))] group-hover:border-white/[0.12]"}`}>
                    <Icon size={16} stroke={1.7} />
                  </span>
                  <span className="flex-1">{link.label}</span>
                  <span className={`h-1.5 w-1.5 rounded-full transition-opacity ${active ? "bg-primary opacity-100" : "opacity-0"}`} />
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
            const active = pathname === link.href || (link.href !== "/account" && pathname.startsWith(`${link.href}/`));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] uppercase tracking-[0.08em] transition-all ${
                  active
                    ? "border-primary/35 bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--primary)/0.05))] text-primary"
                    : "border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.035),hsl(var(--primary)/0.025))] text-muted"
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
