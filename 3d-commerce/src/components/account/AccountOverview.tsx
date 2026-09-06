import Link from "next/link";

import {
  IconArrowUpRight,
  IconMapPin,
  IconPackage,
  IconShoppingBag,
  IconTruck,
} from "@tabler/icons-react";

import { orders } from "@/config/orders";
import { OrderCard } from "./OrderCard";

const stats = [
  { label: "Orders", value: "12", icon: IconPackage, href: "/account/orders" },
  { label: "In transit", value: "2", icon: IconTruck, href: "/account/orders" },
  { label: "Addresses", value: "2", icon: IconMapPin, href: "/account/addresses" },
];

export function AccountOverview() {
  const activeOrders = orders.slice(0, 2);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-primary/[0.04] p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Account overview</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">Your pieces, in one place.</h2>
            <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              Track orders, manage delivery details and keep your account ready for your next build.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            Explore models
            <IconArrowUpRight size={13} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link key={stat.label} href={stat.href} className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:border-white/[0.14] hover:bg-white/[0.035] sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted transition-colors group-hover:text-primary">
                  <Icon size={17} stroke={1.7} />
                </div>
                <IconArrowUpRight size={14} className="text-muted/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                <span className="text-2xl font-medium tracking-tight text-foreground">{stat.value}</span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-4 sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-primary">Recent activity</p>
            <h2 className="mt-1 text-base font-medium text-foreground sm:text-lg">Active orders</h2>
          </div>

          <Link href="/account/orders" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-primary">
            View all
            <IconArrowUpRight size={13} />
          </Link>
        </div>

        <div className="space-y-3">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/account/addresses" className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-primary/20 hover:bg-white/[0.035] sm:p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted group-hover:text-primary">
              <IconMapPin size={17} />
            </span>
            <IconArrowUpRight size={14} className="text-muted/50 group-hover:text-primary" />
          </div>
          <p className="mt-5 text-sm font-medium text-foreground">Delivery addresses</p>
          <p className="mt-1 text-xs leading-5 text-muted">Manage where your physical orders should arrive.</p>
        </Link>

        <Link href="/account/payments" className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-primary/20 hover:bg-white/[0.035] sm:p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted group-hover:text-primary">
              <IconShoppingBag size={17} />
            </span>
            <IconArrowUpRight size={14} className="text-muted/50 group-hover:text-primary" />
          </div>
          <p className="mt-5 text-sm font-medium text-foreground">Payment methods</p>
          <p className="mt-1 text-xs leading-5 text-muted">Review the payment methods available for checkout.</p>
        </Link>
      </div>
    </div>
  );
}
