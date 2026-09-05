"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconHeart,
  IconHome,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconCreditCard,
  IconChevronDown,
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
    label: "Wishlist",
    href: "/account/wishlist",
    icon: IconHeart,
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
      {/* Desktop */}
      <nav className="hidden lg:block">
        <div className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;

            const active =
              pathname === link.href ||
              (link.href !== "/account" &&
                pathname.startsWith(
                  `${link.href}/`,
                ));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-2.5
                  text-xs
                  transition-colors
                  ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:bg-surface-elevated hover:text-foreground"
                  }
                `}
              >
                <Icon size={16} stroke={1.7} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile */}
      <div className="lg:hidden">
        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
            scrollbar-none
          "
        >
          {links.map((link) => {
            const Icon = link.icon;

            const active =
              pathname === link.href ||
              (link.href !== "/account" &&
                pathname.startsWith(
                  `${link.href}/`,
                ));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  px-3
                  py-2
                  text-[10px]
                  uppercase
                  tracking-[0.08em]
                  ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted"
                  }
                `}
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