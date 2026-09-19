"use client";

import Image from "next/image";
import { IconLock, IconShieldCheck, IconTruckDelivery } from "@tabler/icons-react";

import { getCountry, type CountryCode } from "@/config/countries";
import { useCart } from "@/context/CartContext";

interface CheckoutSummaryProps {
  country: CountryCode;
  customerName?: string;
  customerEmail?: string;
}

const cardGradient =
  "bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.07))]";
const innerGradient =
  "bg-[linear-gradient(135deg,hsl(var(--foreground)/0.04),hsl(var(--background)/0.015)_65%,hsl(var(--primary)/0.045))]";

function normalizeImagePath(src: string) {
  if (!src) return "/catogeries/1.jpg";

  try {
    const url = new URL(src);
    if (url.hostname === "example.com") return "/catogeries/1.jpg";
    return url.toString();
  } catch {
    return src.startsWith("/") ? src : `/${src}`;
  }
}

export function CheckoutSummary({
  country,
  customerName,
  customerEmail,
}: CheckoutSummaryProps) {
  const { items } = useCart();
  const countryConfig = getCountry(country);

  return (
    <aside
      className={`rounded-3xl border border-white/[0.1] ${cardGradient} p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:sticky lg:top-24`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">
            Order summary
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-foreground">
            Your order
          </h2>
        </div>
        <span className="text-xs text-muted">
          {items.reduce((count, item) => count + item.quantity, 0)} items
        </span>
      </div>

      {(customerName || customerEmail) && (
        <div className={`mt-4 rounded-xl border border-white/[0.07] ${innerGradient} p-3.5`}>
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted">
            Signed in as
          </p>
          {customerName && (
            <p className="mt-1 text-xs font-medium text-foreground">
              {customerName}
            </p>
          )}
          {customerEmail && (
            <p className="mt-0.5 truncate text-[10px] text-muted">
              {customerEmail}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 max-h-[320px] space-y-3 overflow-auto pr-1">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex min-w-0 gap-3 rounded-xl border border-white/[0.07] ${innerGradient} p-2.5`}
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0b0b0c]">
              <Image
                src={normalizeImagePath(item.product.image)}
                alt={item.product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/80 px-1 text-[9px] font-medium text-white">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {item.product.name}
              </p>
              <p className="mt-1 text-[10px] text-muted">{item.size}</p>
              <p className="mt-1 text-xs text-foreground">
                ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-5 rounded-xl border border-white/[0.07] ${innerGradient} p-3.5`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.13em] text-muted">
            Delivery country
          </span>
          <span className="text-xs font-medium text-foreground">
            {countryConfig.name}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.13em] text-muted">
            Display currency
          </span>
          <span className="text-xs font-medium text-primary">
            {countryConfig.currency}
          </span>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-muted">
          Final shipping, tax, discounts, and total are calculated securely
          from the server quote before payment.
        </p>
      </div>

      <div className={`mt-5 rounded-xl border border-white/[0.07] ${innerGradient} p-4`}>
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted">
          Final total
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          Shown after your delivery address and server quote are validated.
        </p>
      </div>

      <div className={`mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] ${innerGradient} p-3`}>
        <Trust icon={<IconLock size={13} />} label="Secure" />
        <Trust icon={<IconShieldCheck size={13} />} label="Protected" />
        <Trust icon={<IconTruckDelivery size={13} />} label="Tracked" />
      </div>
    </aside>
  );
}

function Trust({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center text-[8px] uppercase tracking-[0.1em] text-muted">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
