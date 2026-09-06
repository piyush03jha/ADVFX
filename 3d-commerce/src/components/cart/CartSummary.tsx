"use client";

import {
  IconArrowRight,
  IconLock,
  IconShieldCheck,
  IconTruckDelivery,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";

export function CartSummary() {
  const { subtotal } = useCart();
  const shipping = subtotal >= 4999 ? 0 : 199;
  const total = subtotal + shipping;
  const remainingForFreeShipping = Math.max(4999 - subtotal, 0);

  return (
    <aside className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(145deg,hsl(var(--foreground)/0.07),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.1))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6 lg:sticky lg:top-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/[0.09] blur-3xl" />
      <div className="relative">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Order summary</p>
        <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-foreground">Your total</h2>
      </div>

      {remainingForFreeShipping > 0 ? (
        <div className="relative mt-5 rounded-xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.1),hsl(var(--background)/0.02))] p-4">
          <div className="flex items-start gap-3">
            <IconTruckDelivery size={17} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted">Add ₹{remainingForFreeShipping.toLocaleString("en-IN")} more for free shipping.</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 rounded-xl border border-emerald-400/15 bg-[linear-gradient(135deg,rgba(52,211,153,0.1),hsl(var(--background)/0.02))] p-4">
          <div className="flex items-center gap-3">
            <IconTruckDelivery size={17} className="shrink-0 text-emerald-400" />
            <p className="text-xs font-medium text-emerald-300">You unlocked free shipping.</p>
          </div>
        </div>
      )}

      <div className="relative mt-6 space-y-3 rounded-xl border border-white/[0.06] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.035),hsl(var(--background)/0.015))] p-4">
        <SummaryRow label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
        <SummaryRow label="Shipping" value={shipping === 0 ? "FREE" : `₹${shipping.toLocaleString("en-IN")}`} positive={shipping === 0} />
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-4 rounded-xl border border-white/[0.06] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.04),hsl(var(--background)/0.015)_65%,hsl(var(--primary)/0.05))] p-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Total</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">₹{total.toLocaleString("en-IN")}</p>
        </div>
        <span className="text-[9px] text-muted">Inclusive of applicable taxes</span>
      </div>

      <Button href="/checkout" size="lg" className="relative mt-6 w-full">Proceed to Checkout <IconArrowRight size={16} /></Button>

      <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5">
        <TrustItem icon={<IconLock size={14} />} text="Secure checkout" />
        <TrustItem icon={<IconShieldCheck size={14} />} text="Protected payment" />
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

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.08em] text-muted">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
