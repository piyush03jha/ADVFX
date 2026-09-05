import Link from "next/link";

import {
  IconArrowUpRight,
  IconHeart,
  IconMapPin,
  IconPackage,
  IconTruck,
} from "@tabler/icons-react";

import { orders } from "@/config/orders";
import { OrderCard } from "./OrderCard";

const stats = [
  {
    label: "Orders",
    value: "12",
    icon: IconPackage,
  },
  {
    label: "In transit",
    value: "2",
    icon: IconTruck,
  },
  {
    label: "Wishlist",
    value: "7",
    icon: IconHeart,
  },
  {
    label: "Addresses",
    value: "2",
    icon: IconMapPin,
  },
];

export function AccountOverview() {
  const activeOrders = orders.slice(0, 2);

  return (
    <div className="space-y-6">
      <div
        className="
          grid
          grid-cols-2
          gap-2
          sm:grid-cols-4
          sm:gap-3
        "
      >
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="
                rounded-2xl
                border
                border-border
                bg-surface/50
                p-3
                sm:p-4
              "
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={16}
                  className="text-muted"
                />

                <span className="text-lg font-medium text-foreground">
                  {stat.value}
                </span>
              </div>

              <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-muted">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-primary">
              Recent activity
            </p>

            <h2 className="mt-1 text-sm font-medium text-foreground">
              Active orders
            </h2>
          </div>

          <Link
            href="/account/orders"
            className="
              flex
              items-center
              gap-1
              text-[10px]
              text-muted
              hover:text-foreground
            "
          >
            View all
            <IconArrowUpRight size={13} />
          </Link>
        </div>

        <div className="space-y-3">
          {activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
            />
          ))}
        </div>
      </section>
    </div>
  );
}