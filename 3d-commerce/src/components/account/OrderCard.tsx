import Link from "next/link";
import { IconArrowUpRight, IconChevronRight } from "@tabler/icons-react";
import type { BackendOrder } from "@/lib/account-orders";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

export function OrderCard({ order }: { order: BackendOrder }) {
  const firstItem = order.items[0];
  const extraItems = Math.max(0, order.items.length - 1);

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="group block rounded-2xl border border-white/[0.1] bg-surface p-3 shadow-[0_16px_50px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-primary/30 sm:p-4"
    >
      <div className="flex gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[9px] uppercase tracking-[0.12em] text-primary sm:h-24 sm:w-24">
          Physical
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {firstItem?.productName ?? "Physical order"}
              </p>
              {firstItem?.variantName && (
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  {firstItem.variantName}
                </p>
              )}
              {extraItems > 0 && (
                <p className="mt-0.5 text-[10px] text-muted">
                  +{extraItems} more {extraItems === 1 ? "item" : "items"}
                </p>
              )}
            </div>
            <IconArrowUpRight size={16} className="shrink-0 text-muted" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-primary">
              {statusLabel(order.status)}
            </span>
            <span className="text-[10px] text-muted">
              {formatMoney(order.totalMinor, order.currency)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted">{order.orderNumber}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {order.shipment?.trackingNumber
              ? `Tracking ${order.shipment.trackingNumber}`
              : "Delivery details available in order"}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-foreground">
          View order <IconChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}
