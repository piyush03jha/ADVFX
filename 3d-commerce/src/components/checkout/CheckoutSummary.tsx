"use client";

import Image from "next/image";

import { IconLock, IconShieldCheck, IconTruckDelivery } from "@tabler/icons-react";

import { getCountry, type CountryCode } from "@/config/countries";
import { useCart } from "@/context/CartContext";

interface CheckoutSummaryProps {
  country: CountryCode;
}

export function CheckoutSummary({ country }: CheckoutSummaryProps) {
  const { items, subtotal } = useCart();
  const countryConfig = getCountry(country);
  const shipping = subtotal >= 4999 ? 0 : 199;
  const total = subtotal + shipping;

  return (
    <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Order summary</p>
          <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-foreground">Your order</h2>
        </div>
        <span className="text-xs text-muted">{items.reduce((count, item) => count + item.quantity, 0)} items</span>
      </div>

      <div className="mt-5 max-h-[280px] space-y-3 overflow-auto pr-1">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0b0b0c]">
              <Image
                src={item.product.image.startsWith("/") ? item.product.image : `/${item.product.image}`}
                alt={item.product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/80 px-1 text-[9px] font-medium text-white">{item.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{item.product.name}</p>
              <p className="mt-1 text-[10px] text-muted">{item.size.charAt(0).toUpperCase() + item.size.slice(1)}</p>
              <p className="mt-1 text-xs text-foreground">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/10 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.13em] text-muted">Delivery country</span>
          <span className="text-xs font-medium text-foreground">{countryConfig.name}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.13em] text-muted">Display currency</span>
          <span className="text-xs font-medium text-primary">{countryConfig.currency}</span>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-muted">Country-specific pricing will be applied when the pricing service is connected.</p>
      </div>

      <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-5">
        <SummaryRow label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
        <SummaryRow label="Shipping" value={shipping === 0 ? "FREE" : `₹${shipping.toLocaleString("en-IN")}`} positive={shipping === 0} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.07] pt-5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Total</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">₹{total.toLocaleString("en-IN")}</p>
        </div>
        <span className="text-right text-[9px] leading-4 text-muted">Base catalog<br />pricing</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-5">
        <Trust icon={<IconLock size={13} />} label="Secure" />
        <Trust icon={<IconShieldCheck size={13} />} label="Protected" />
        <Trust icon={<IconTruckDelivery size={13} />} label="Tracked" />
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className={positive ? "font-medium text-emerald-400" : "font-medium text-foreground"}>{value}</span>
    </div>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center text-[8px] uppercase tracking-[0.1em] text-muted">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
