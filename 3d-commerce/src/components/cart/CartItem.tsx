"use client";

import Image from "next/image";

import {
  IconHeart,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { useCart } from "@/context/CartContext";

import type { CartItem as CartItemType } from "@/context/CartContext";

interface CartItemProps {
  item: CartItemType;
}

const sizeLabel: Record<CartItemType["size"], string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

function normalizeImagePath(src: string) {
  if (!src) return "/images/placeholder.jpg";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}

export function CartItem({ item }: CartItemProps) {
  const { decrementItem, incrementItem, removeItem } = useCart();
  const total = item.product.price * item.quantity;
  const imageSrc = normalizeImagePath(item.product.image);

  return (
    <article className="group relative my-2 grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.018)_55%,hsl(var(--primary)/0.055))] px-3 py-4 shadow-[0_14px_45px_rgba(0,0,0,0.1)] transition-all hover:border-primary/20 hover:shadow-[0_18px_55px_rgba(0,0,0,0.15)] sm:grid-cols-[116px_minmax(0,1fr)_auto] sm:gap-5 sm:px-4 sm:py-5">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.07] bg-[linear-gradient(145deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02))]">
        <Image src={imageSrc} alt={item.product.name} fill sizes="116px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>

      <div className="min-w-0 py-0.5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[9px] uppercase tracking-[0.16em] text-primary">{item.product.category}</p>
            <h3 className="mt-1.5 truncate text-sm font-medium text-foreground sm:text-base">{item.product.name}</h3>
          </div>
          <button type="button" aria-label={`Remove ${item.product.name}`} onClick={() => removeItem(item.key)} className="shrink-0 text-muted transition-colors hover:text-red-400 sm:hidden">
            <IconTrash size={16} stroke={1.6} />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
          <span>Size: {sizeLabel[item.size]}</span>
          <span className="h-1 w-1 rounded-full bg-muted/35" />
          <span>₹{item.product.price.toLocaleString("en-IN")} each</span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex h-9 items-center rounded-full border border-white/[0.08] bg-white/[0.025]">
            <button type="button" aria-label="Decrease quantity" onClick={() => decrementItem(item.key)} className="flex h-full w-8 items-center justify-center text-muted transition-colors hover:text-foreground">
              <IconMinus size={13} />
            </button>
            <span className="min-w-5 text-center text-xs font-medium text-foreground">{item.quantity}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => incrementItem(item.key)} className="flex h-full w-8 items-center justify-center text-muted transition-colors hover:text-foreground">
              <IconPlus size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <IconHeart size={15} className="text-muted/70" />
            <p className="text-sm font-medium text-foreground">₹{total.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      <div className="hidden min-w-[120px] flex-col items-end justify-between py-0.5 sm:flex">
        <p className="text-sm font-medium text-foreground">₹{total.toLocaleString("en-IN")}</p>
        <button type="button" onClick={() => removeItem(item.key)} className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.13em] text-muted transition-colors hover:text-red-400">
          <IconTrash size={13} stroke={1.5} />
          Remove
        </button>
      </div>
    </article>
  );
}
