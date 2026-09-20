"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowUpRight,
  IconBox,
  IconChartBar,
  IconMapPin,
  IconPackage,
  IconRefresh,
  IconTruck,
  IconUsers,
} from "@tabler/icons-react";

type Dashboard = {
  products: { total: number; active: number; archived: number };
  categories: number;
  lowStockProducts: number;
  inventory: { availableUnits: number; reservedUnits: number };
  orders: {
    total: number;
    pendingPayment: number;
    processing: number;
    readyToShip: number;
  };
  customBuilds: { total: number; needsAttention: number };
  customers: number;
  deliveryRules: number;
  settings: number;
};

type Merchandising = {
  algorithm: {
    bestseller: string;
    newArrival: string;
  };
  bestsellers: Array<{
    id: string;
    name: string;
    rankingScore: number;
  }>;
  newArrivals: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
};

type DashboardCard = {
  label: string;
  value: string;
  href: string;
  Icon: typeof IconPackage;
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [merchandising, setMerchandising] = useState<Merchandising | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const [dashboardResponse, merchandisingResponse] = await Promise.all([
        fetch("/api/admin/dashboard", { cache: "no-store" }),
        fetch("/api/admin/merchandising", { cache: "no-store" }),
      ]);

      if (dashboardResponse.ok) {
        setDashboard(await dashboardResponse.json());
      }

      if (merchandisingResponse.ok) {
        setMerchandising(await merchandisingResponse.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cards: DashboardCard[] = dashboard
    ? [
        {
          label: "Products",
          value: `${dashboard.products.active} active`,
          Icon: IconPackage,
          href: "/admin/products",
        },
        {
          label: "Orders",
          value: String(dashboard.orders.total),
          Icon: IconBox,
          href: "/admin/orders",
        },
        {
          label: "Customers",
          value: String(dashboard.customers),
          Icon: IconUsers,
          href: "/admin/customers",
        },
        {
          label: "Delivery rules",
          value: String(dashboard.deliveryRules),
          Icon: IconMapPin,
          href: "/admin/shipping",
        },
        {
          label: "Low stock",
          value: String(dashboard.lowStockProducts),
          Icon: IconTruck,
          href: "/admin/products",
        },
        {
          label: "Custom requests",
          value: `${dashboard.customBuilds.needsAttention} to review`,
          Icon: IconChartBar,
          href: "/admin/custom-requests",
        },
      ]
    : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">
            Operations
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl">
            Admin dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            One workspace for catalog, merchandising, customers, fulfillment
            and delivery coverage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-border p-2 text-muted hover:text-foreground"
          aria-label="Refresh dashboard"
        >
          <IconRefresh size={16} />
        </button>
      </div>

      {loading ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-surface"
            />
          ))}
        </div>
      ) : (
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ label, value, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={17} />
                </span>
                <IconArrowUpRight
                  size={16}
                  className="text-muted transition group-hover:text-primary"
                />
              </div>

              <p className="mt-4 text-[9px] uppercase tracking-[0.14em] text-muted">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-primary">
                Merchandising
              </p>
              <h2 className="mt-2 text-xl font-semibold">Bestsellers</h2>
            </div>

            <Link
              href="/admin/settings"
              className="text-[10px] text-muted hover:text-primary"
            >
              Store controls ↗
            </Link>
          </div>

          <p className="mt-2 text-[10px] leading-5 text-muted">
            {merchandising?.algorithm.bestseller ??
              "Calculated from product performance."}
          </p>

          <div className="mt-4 space-y-2">
            {merchandising?.bestsellers.slice(0, 6).map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs">{product.name}</span>
                </div>
                <span className="text-[10px] text-muted">
                  {product.rankingScore}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-primary">
            Merchandising
          </p>
          <h2 className="mt-2 text-xl font-semibold">New arrivals</h2>

          <p className="mt-2 text-[10px] leading-5 text-muted">
            {merchandising?.algorithm.newArrival ??
              "Newest active products by creation date."}
          </p>

          <div className="mt-4 space-y-2">
            {merchandising?.newArrivals.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <span className="text-xs">{product.name}</span>
                <span className="text-[10px] text-muted">
                  {new Date(product.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
