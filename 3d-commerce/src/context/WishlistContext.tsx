"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { StorefrontProduct } from "@/lib/catalog-api";
import { useAuth } from "@/context/AuthContext";
import { resolveMediaUrl } from "@/lib/media-url";

export interface WishlistProduct {
  id: string;
  name: string;
  slug?: string;
  category: string;
  price: number;
  image: string;
  oldPrice?: number;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  discount?: string;
  model?: string;
  /** The customer's selected cart configuration; wishlist API stores products only. */
  variantId?: string | null;
  variantName?: string | null;
  variantSize?: string | null;
  size?: string;
}

interface WishlistContextValue {
  items: WishlistProduct[];
  itemCount: number;
  isLoaded: boolean;
  isSyncing: boolean;
  error: string | null;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProduct) => Promise<void>;
  addToWishlist: (product: WishlistProduct) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const STORAGE_KEY = "forma-wishlist";
const SELECTION_STORAGE_KEY = "forma-wishlist-selections";

type WishlistSelection = Pick<WishlistProduct, "variantId" | "variantName" | "variantSize" | "size" | "price" | "oldPrice">;

function readWishlistSelections(): Record<string, WishlistSelection> {
  try {
    const raw = window.localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, WishlistSelection>
      : {};
  } catch {
    window.localStorage.removeItem(SELECTION_STORAGE_KEY);
    return {};
  }
}

function writeWishlistSelection(product: WishlistProduct) {
  try {
    const selections = readWishlistSelections();
    selections[product.id] = {
      variantId: product.variantId ?? null,
      variantName: product.variantName ?? null,
      variantSize: product.variantSize ?? null,
      size: product.size ?? "Standard",
      price: product.price,
      oldPrice: product.oldPrice,
    };
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // Selection metadata is best-effort when browser storage is unavailable.
  }
}

function removeWishlistSelection(productId: string) {
  try {
    const selections = readWishlistSelections();
    delete selections[productId];
    if (Object.keys(selections).length) {
      window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selections));
    } else {
      window.localStorage.removeItem(SELECTION_STORAGE_KEY);
    }
  } catch {
    // Ignore local storage failures.
  }
}

function clearWishlistSelections() {
  try {
    window.localStorage.removeItem(SELECTION_STORAGE_KEY);
  } catch {
    // Ignore local storage failures.
  }
}

function mergeWishlistSelection(product: WishlistProduct): WishlistProduct {
  const selection = readWishlistSelections()[product.id];
  if (!selection) return product;

  // Older wishlist entries can contain a stale zero price. Never let that
  // local snapshot overwrite the current catalog price returned by the API.
  const selectedPrice =
    typeof selection.price === "number" &&
    Number.isFinite(selection.price) &&
    selection.price > 0
      ? selection.price
      : product.price;

  const selectedOldPrice =
    typeof selection.oldPrice === "number" &&
    Number.isFinite(selection.oldPrice) &&
    selection.oldPrice > 0
      ? selection.oldPrice
      : product.oldPrice;

  return {
    ...product,
    ...selection,
    price: selectedPrice,
    oldPrice: selectedOldPrice,
  };
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function isValidProduct(value: unknown): value is WishlistProduct {
  if (!value || typeof value !== "object") return false;

  const product = value as Partial<WishlistProduct>;

  return Boolean(
    typeof product.id === "string" &&
      typeof product.name === "string" &&
      typeof product.category === "string" &&
      typeof product.price === "number" &&
      Number.isFinite(product.price) &&
      typeof product.image === "string",
  );
}

function readGuestWishlist(): WishlistProduct[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid = parsed.filter(isValidProduct);

    if (valid.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeGuestWishlist(items: WishlistProduct[]) {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Local guest persistence is best-effort.
  }
}

function clearGuestWishlist() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

type BackendWishlistProduct = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  rating?: number;
  reviewCount?: number;
  category?: { id: string; name: string; slug: string } | null;
  prices?: Array<{
    id: string;
    currency: string;
    amountMinor: number;
    compareAtMinor?: number | null;
    isActive: boolean;
  }>;
  media?: Array<{
    id: string;
    type: "IMAGE" | "MODEL_PREVIEW";
    url: string;
    altText?: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  badge?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    price?: {
      id?: string;
      currency: string;
      amountMinor: number;
      compareAtMinor?: number | null;
      isActive: boolean;
    } | null;
  }>;
};

type BackendWishlistResponse = {
  id: string | null;
  items: Array<{
    id: string;
    product: BackendWishlistProduct;
    createdAt: string;
  }>;
};

function mapBackendProduct(product: BackendWishlistProduct): WishlistProduct {
  const variantPrices = (product.variants ?? [])
    .filter((variant) => variant.isActive && variant.price?.isActive)
    .map((variant) => ({
      amountMinor: variant.price!.amountMinor,
      compareAtMinor: variant.price!.compareAtMinor ?? undefined,
      currency: variant.price!.currency,
    }));
  const lowestVariantPrice =
    variantPrices.filter((candidate) => candidate.currency === "INR").sort((a, b) => a.amountMinor - b.amountMinor)[0] ??
    variantPrices.sort((a, b) => a.amountMinor - b.amountMinor)[0];
  const price =
    lowestVariantPrice ??
    product.prices?.find((candidate) => candidate.currency === "INR" && candidate.isActive) ??
    product.prices?.find((candidate) => candidate.isActive) ??
    product.prices?.[0];

  const amountMinor = price?.amountMinor ?? 0;
  const compareAtMinor = price?.compareAtMinor ?? undefined;

  const imageUrl =
    product.media?.find(
      (media) => media.type === "IMAGE" && media.isPrimary,
    )?.url ??
    product.media?.find((media) => media.type === "IMAGE")?.url ??
    "/placeholder-product.webp";
  const image = resolveMediaUrl(imageUrl) ?? "/placeholder-product.webp";

  const model =
    product.media?.find(
      (media) => media.type === "MODEL_PREVIEW" && media.isPrimary,
    )?.url ??
    product.media?.find(
      (media) => media.type === "MODEL_PREVIEW",
    )?.url ??
    "";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name ?? "Uncategorized",
    price: amountMinor / 100,
    image,
    oldPrice:
      compareAtMinor !== undefined
        ? compareAtMinor / 100
        : undefined,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    badge: product.badge ?? undefined,
    discount:
      compareAtMinor !== undefined && compareAtMinor > amountMinor
        ? `${Math.round(((compareAtMinor - amountMinor) / compareAtMinor) * 100)}% OFF`
        : undefined,
    model: resolveMediaUrl(model) ?? "",
  };
}

function toWishlistProduct(
  product: WishlistProduct | StorefrontProduct,
): WishlistProduct {
  return {
    id: product.id,
    name: product.name,
    slug: "slug" in product ? product.slug : undefined,
    category: product.category,
    price: product.price,
    image: product.image,
    oldPrice: product.oldPrice,
    rating: product.rating,
    reviewCount: product.reviewCount,
    badge: product.badge,
    discount: product.discount,
    model: product.model,
    variantId: "variantId" in product ? product.variantId ?? null : null,
    variantName: "variantName" in product ? product.variantName ?? null : null,
    variantSize: "variantSize" in product ? product.variantSize ?? null : null,
    size: "size" in product ? product.size ?? "Standard" : "Standard",
  };
}

async function readBackendWishlist(): Promise<WishlistProduct[]> {
  const response = await fetch("/api/wishlist", {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | BackendWishlistResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data && "error" in data
        ? data.error ?? "Unable to load your wishlist."
        : "Unable to load your wishlist.",
    );
  }

  const wishlist = data as BackendWishlistResponse;
  return wishlist.items.map((item) => mergeWishlistSelection(mapBackendProduct(item.product)));
}

async function addBackendWishlistItem(productId: string) {
  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | BackendWishlistResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data && "error" in data
        ? data.error ?? "Unable to add this product to your wishlist."
        : "Unable to add this product to your wishlist.",
    );
  }

  return (data as BackendWishlistResponse).items.map((item) =>
    mergeWishlistSelection(mapBackendProduct(item.product)),
  );
}

async function removeBackendWishlistItem(productId: string) {
  const response = await fetch(
    `/api/wishlist?productId=${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => null)) as
    | BackendWishlistResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data && "error" in data
        ? data.error ?? "Unable to remove this product from your wishlist."
        : "Unable to remove this product from your wishlist.",
    );
  }

  return (data as BackendWishlistResponse).items.map((item) =>
    mergeWishlistSelection(mapBackendProduct(item.product)),
  );
}

async function clearBackendWishlist() {
  const response = await fetch("/api/wishlist", {
    method: "DELETE",
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | BackendWishlistResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data && "error" in data
        ? data.error ?? "Unable to clear your wishlist."
        : "Unable to clear your wishlist.",
    );
  }

  return (data as BackendWishlistResponse).items.map((item) =>
    mergeWishlistSelection(mapBackendProduct(item.product)),
  );
}

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWishlist = useCallback(async () => {
    if (isAuthLoading) return;

    setIsSyncing(true);
    setError(null);

    try {
      if (!isAuthenticated) {
        const guestItems = readGuestWishlist();
        setItems(guestItems);
        return;
      }

      const guestItems = readGuestWishlist();

      // Clear first so concurrent refreshes cannot submit the same guest
      // wishlist entries more than once.
      clearGuestWishlist();

      let skipped = 0;
      const failedProducts: WishlistProduct[] = [];
      for (const product of guestItems) {
        try {
          writeWishlistSelection(product);
          await addBackendWishlistItem(product.id);
        } catch {
          skipped += 1;
          failedProducts.push(product);
        }
      }

      try {
        setItems(await readBackendWishlist());
      } catch (cause) {
        writeGuestWishlist(failedProducts);
        throw cause;
      }

      if (skipped > 0) {
        setError(
          `${skipped} item(s) from before you signed in are no longer available.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load your wishlist.",
      );

      if (!isAuthenticated) {
        setItems(readGuestWishlist());
      }
    } finally {
      setIsLoaded(true);
      setIsSyncing(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    void refreshWishlist();
  }, [isAuthLoading, user?.id, refreshWishlist]);

  const isInWishlist = useCallback(
    (productId: string) => items.some((item) => item.id === productId),
    [items],
  );

  const addToWishlist = useCallback(
    async (product: WishlistProduct) => {
      const normalized = toWishlistProduct(product);
      setError(null);

      if (!isAuthenticated) {
        const current = readGuestWishlist();

        const next = current.some((item) => item.id === normalized.id)
          ? current.map((item) => item.id === normalized.id ? normalized : item)
          : [...current, normalized];
        writeWishlistSelection(normalized);
        writeGuestWishlist(next);
        setItems(next);
        return true;
      }

      const previous = items;
      if (!isInWishlist(normalized.id)) {
        setItems([...items, normalized]);
      }
      setIsSyncing(true);

      try {
        const next = await addBackendWishlistItem(normalized.id);
        writeWishlistSelection(normalized);
        setItems(next.map((item) => item.id === normalized.id ? normalized : mergeWishlistSelection(item)));
      } catch (cause) {
        setItems(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to add this product to your wishlist.",
        );
        return false;
      } finally {
        setIsSyncing(false);
      }

      return true;
    },
    [isAuthenticated, isInWishlist, items],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      setError(null);

      if (!isAuthenticated) {
        const next = readGuestWishlist().filter(
          (item) => item.id !== productId,
        );
        removeWishlistSelection(productId);
        writeGuestWishlist(next);
        setItems(next);
        return true;
      }

      const previous = items;
      setItems(items.filter((item) => item.id !== productId));
      setIsSyncing(true);

      try {
        const next = await removeBackendWishlistItem(productId);
        removeWishlistSelection(productId);
        setItems(next);
      } catch (cause) {
        setItems(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to remove this product from your wishlist.",
        );
        return false;
      } finally {
        setIsSyncing(false);
      }

      return true;
    },
    [isAuthenticated, items],
  );

  const toggleWishlist = useCallback(
    async (product: WishlistProduct) => {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
    },
    [addToWishlist, isInWishlist, removeFromWishlist],
  );

  const clearWishlist = useCallback(async () => {
    setError(null);

    if (!isAuthenticated) {
      clearGuestWishlist();
      clearWishlistSelections();
      setItems([]);
      return;
    }

    const previous = items;
    setItems([]);
    setIsSyncing(true);

    try {
      await clearBackendWishlist();
      clearWishlistSelections();
      setItems([]);
    } catch (cause) {
      setItems(previous);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to clear your wishlist.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, items]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      itemCount: items.length,
      isLoaded,
      isSyncing,
      error,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      refreshWishlist,
    }),
    [
      items,
      isLoaded,
      isSyncing,
      error,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      refreshWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  return context;
}
