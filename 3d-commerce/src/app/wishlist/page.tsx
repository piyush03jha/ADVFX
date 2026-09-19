"use client";

import Link from "next/link";
import { IconArrowLeft, IconHeart, IconShoppingCart, IconTrash } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistPage() {
  const {
    items,
    isLoaded,
    removeFromWishlist,
    clearWishlist,
    isSyncing,
  } = useWishlist();
  const { items: cartItems, addItem, removeItem, updateQuantity, isSyncing: isCartSyncing } = useCart();

  async function moveToCart(product: (typeof items)[number]) {
    if (isSyncing || isCartSyncing) return;

    const existing = cartItems.find(
      (item) => item.product.id === product.id && item.variantId === null,
    );
    const previousQuantity = existing?.quantity ?? 0;

    try {
      await addItem(product, null, 1);
      try {
        await removeFromWishlist(product.id);
      } catch (cause) {
        if (existing) {
          await updateQuantity(existing.key, previousQuantity);
        } else {
          await removeItem(`${product.id}:base`);
        }
        throw cause;
      }
    } catch {
      // Contexts expose the operation error in their UI state; avoid a second action.
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl lg:text-4xl">Wishlist</h1>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {items.length} {items.length === 1 ? "product" : "products"} saved
              </p>
            </div>

            {items.length > 0 && (
              <button type="button" onClick={() => void clearWishlist()} disabled={isSyncing || isCartSyncing} className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-primary disabled:opacity-50">
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
                    <div className="relative aspect-[4/4.8] overflow-hidden bg-surface-elevated">
                      <Link href={`/product/${product.id}`} className="block h-full">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                      </Link>

                      <button type="button" aria-label={`Remove ${product.name} from wishlist`} onClick={() => void removeFromWishlist(product.id)} disabled={isSyncing || isCartSyncing} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-md transition hover:border-primary/40 hover:text-primary sm:right-3 sm:top-3">
                        <IconTrash size={14} stroke={1.5} />
                      </button>
                    </div>

                    <div className="p-3 sm:p-4">
                      <p className="text-[8px] uppercase tracking-[0.14em] text-muted">{product.category}</p>
                      <Link href={`/product/${product.id}`} className="mt-1 block text-xs font-medium text-foreground hover:text-primary sm:text-sm">{product.name}</Link>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Price value={product.price} size="sm" />
                        <button type="button" aria-label={`Move ${product.name} to cart`} onClick={() => void moveToCart(product)} disabled={isSyncing || isCartSyncing} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[9px] font-medium uppercase tracking-[0.1em] text-muted transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary disabled:opacity-50 sm:h-9 sm:px-3.5">
                          <IconShoppingCart size={14} />
                          Move to cart
                        </button>
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
