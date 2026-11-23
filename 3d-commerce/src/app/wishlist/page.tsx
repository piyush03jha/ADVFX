"use client";

import Link from "next/link";
import { useState } from "react";
import { IconArrowLeft, IconHeart, IconShoppingCart, IconTrash } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useWishlist, type WishlistProduct } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";

export default function WishlistPage() {
  const { addItem, isSyncing: cartSyncing } = useCart();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const {
    items,
    isLoaded,
    removeFromWishlist,
    clearWishlist,
    isSyncing,
    error,
    refreshWishlist,
  } = useWishlist();

  async function moveToCart(product: WishlistProduct) {
    if (movingId || isSyncing || cartSyncing) return;

    setMoveError(null);
    setMovingId(product.id);
    try {
      // Preserve an explicitly saved variant instead of moving a different size.
      const selection = product.variantId
        ? {
            id: product.variantId,
            name: product.variantName ?? product.variantSize ?? product.size ?? "Selected size",
            size: product.variantSize ?? product.size ?? undefined,
            price: product.price,
            oldPrice: product.oldPrice,
          }
        : product.size ?? "Standard";
      const added = await addItem(product, selection, 1);
      if (!added) {
        setMoveError(`Couldn't add "${product.name}" to your cart. Please check that it is still available.`);
        return;
      }

      // Only remove the wishlist item after the cart confirms the add.
      const removed = await removeFromWishlist(product.id);
      if (!removed) {
        setMoveError(`"${product.name}" is in your cart, but could not be removed from the wishlist. You can remove it manually.`);
      }
    } catch {
      setMoveError(`Couldn't move "${product.name}" to your cart. Please try again.`);
    } finally {
      setMovingId(null);
    }
  }

  if (!isLoaded) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-26 lg:px-8 lg:pb-12 lg:pt-28">
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-24 sm:px-6 sm:pb-8 lg:px-8 lg:pb-12">
          {error && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshWishlist()}>
                Retry
              </Button>
            </div>
          )}

          {moveError && (
            <div role="alert" className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-xs text-amber-200">
              {moveError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl lg:text-4xl">Wishlist</h1>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {items.length} {items.length === 1 ? "product" : "products"} saved
              </p>
            </div>

            {items.length > 0 && (
              <button type="button" onClick={() => void clearWishlist()} disabled={isSyncing} className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-primary disabled:opacity-50">
                Clear all
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <section className="mt-6 flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-surface/40 px-5 text-center sm:mt-8">
              <div className="max-w-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-muted">
                  <IconHeart size={20} stroke={1.5} />
                </div>
                <h2 className="mt-4 text-lg font-medium text-foreground">Your wishlist is empty</h2>
                <p className="mt-2 text-xs leading-5 text-muted sm:text-sm">Save products you like and come back to them anytime.</p>
                <Link href="/shop" className="mt-5 inline-flex"><Button size="sm">Explore Shop</Button></Link>
              </div>
            </section>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                {items.map((product) => (
                  <article key={product.id} className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/50">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
                      <Link href={`/product/${product.slug ?? product.id}`} className="absolute inset-0 block">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                      </Link>

                      <button type="button" aria-label={`Remove ${product.name} from wishlist`} onClick={() => void removeFromWishlist(product.id)} disabled={isSyncing} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-md transition hover:border-primary/40 hover:text-primary sm:right-3 sm:top-3">
                        <IconTrash size={14} stroke={1.5} />
                      </button>
                    </div>

                    <div className="border-t border-border/60 px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => void moveToCart(product)}
                        disabled={movingId !== null || isSyncing || cartSyncing || product.price <= 0}
                        aria-label={`Move ${product.name} to cart`}
                        aria-busy={movingId === product.id}
                        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                      >
                        <IconShoppingCart size={17} stroke={1.8} aria-hidden="true" />
                        {movingId === product.id ? "Moving…" : product.price > 0 ? "Move to Cart" : "Unavailable"}
                      </button>
                    </div>

                    <div className="p-3 pt-1 sm:p-4 sm:pt-1">
                      <p className="text-[8px] uppercase tracking-[0.14em] text-muted">{product.category}</p>
                      <Link href={`/product/${product.slug ?? product.id}`} className="mt-1 block text-xs font-medium text-foreground hover:text-primary sm:text-sm">{product.name}</Link>
                      {product.size ? (
                        <p className="mt-1 text-[10px] text-muted">Selected size: {product.size}</p>
                      ) : null}

                      <div className="mt-2 flex items-center justify-start gap-2">
                        {product.price > 0 ? <Price value={product.price} size="sm" /> : <span className="text-xs text-muted">Price unavailable</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <Link href="/shop" className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-foreground">
                <IconArrowLeft size={13} />
                Continue shopping
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
