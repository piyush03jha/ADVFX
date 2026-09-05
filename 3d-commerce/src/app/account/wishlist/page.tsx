"use client";

import Link from "next/link";
import { IconHeart, IconShoppingCart, IconTrash } from "@tabler/icons-react";

import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export default function AccountWishlistPage() {
  const { items, isLoaded, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  return (
    <>
      <Navbar />
      <AccountShell
        title="Wishlist"
        description="Products you've saved to revisit later."
      >
        {!isLoaded ? (
          <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-muted">
              <IconHeart size={20} stroke={1.5} />
            </div>
            <h2 className="mt-4 text-sm font-medium text-foreground">Your wishlist is empty</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Save products you like and come back to them anytime.
            </p>
            <Link href="/shop" className="mt-5 inline-flex">
              <Button size="sm">Explore Shop</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((product) => (
              <article
                key={product.id}
                className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/50"
              >
                <div className="relative aspect-[4/4.8] overflow-hidden bg-surface-elevated">
                  <Link href={`/product/${product.id}`} className="block h-full">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                  </Link>

                  <button
                    type="button"
                    aria-label={`Remove ${product.name} from wishlist`}
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-md transition hover:border-primary/40 hover:text-primary"
                  >
                    <IconTrash size={14} stroke={1.5} />
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-[8px] uppercase tracking-[0.14em] text-muted">{product.category}</p>
                  <Link
                    href={`/product/${product.id}`}
                    className="mt-1 block text-xs font-medium text-foreground hover:text-primary"
                  >
                    {product.name}
                  </Link>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Price value={product.price} size="sm" />
                    <button
                      type="button"
                      aria-label={`Add ${product.name} to cart`}
                      onClick={() => addItem(product, "medium", 1)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    >
                      <IconShoppingCart size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AccountShell>
    </>
  );
}