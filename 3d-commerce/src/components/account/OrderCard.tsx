import Link from "next/link";
import { IconArrowUpRight, IconChevronRight } from "@tabler/icons-react";

import type { Order } from "@/config/orders";
import { getOrderStatusLabel } from "@/config/orders";

interface OrderCardProps { order: Order; }

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function OrderCard({ order }: OrderCardProps) {
  const firstItem = order.items[0];
  const extraItems = order.items.length - 1;

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="group block rounded-2xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.09))] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-[linear-gradient(135deg,hsl(var(--foreground)/0.08),hsl(var(--background)/0.025)_50%,hsl(var(--primary)/0.12))] sm:p-4"
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--foreground)/0.08),hsl(var(--primary)/0.06))] sm:h-24 sm:w-24">
          <img src={firstItem.image} alt={firstItem.name} className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{firstItem.name}</p>
              {extraItems > 0 && <p className="mt-0.5 text-[10px] text-muted">+{extraItems} more {extraItems === 1 ? "item" : "items"}</p>}
            </div>
            <IconArrowUpRight size={16} className="shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-primary">{getOrderStatusLabel(order.status)}</span>
            <span className="text-[10px] text-muted">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted">{order.orderNumber}</p>
          <p className="mt-0.5 text-[10px] text-muted">{order.shipment?.estimatedDelivery ? `Expected ${order.shipment.estimatedDelivery}` : "Order details"}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-foreground">View order <IconChevronRight size={13} /></span>
      </div>
    </Link>
  );
}
