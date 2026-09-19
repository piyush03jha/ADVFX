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
}

interface WishlistContextValue {
  items: WishlistProduct[];
  itemCount: number;
  isLoaded: boolean;
  isSyncing: boolean;
  error: string | null;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProduct) => Promise<void>;
  addToWishlist: (product: WishlistProduct) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const STORAGE_KEY = "forma-wishlist";

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
  variants?: unknown[];
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
  const price =
    product.prices?.find(
      (candidate) =>
        candidate.currency === "INR" && candidate.isActive,
    ) ??
    product.prices?.find((candidate) => candidate.isActive) ??
    product.prices?.[0];

  const amountMinor = price?.amountMinor ?? 0;
  const compareAtMinor = price?.compareAtMinor ?? undefined;

  const image =
    product.media?.find(
      (media) => media.type === "IMAGE" && media.isPrimary,
    )?.url ??
    product.media?.find((media) => media.type === "IMAGE")?.url ??
    "/catogeries/1.jpg";

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
    rating: 0,
    reviewCount: 0,
    badge: product.badge ?? undefined,
    discount:
      compareAtMinor !== undefined && compareAtMinor > amountMinor
        ? `${Math.round(((compareAtMinor - amountMinor) / compareAtMinor) * 100)}% OFF`
        : undefined,
    model,
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
  return wishlist.items.map((item) => mapBackendProduct(item.product));
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
    mapBackendProduct(item.product),
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
    mapBackendProduct(item.product),
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
    mapBackendProduct(item.product),
  );
}

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
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

      for (const product of guestItems) {
        await addBackendWishlistItem(product.id);
      }

      if (guestItems.length > 0) {
        clearGuestWishlist();
      }

      setItems(await readBackendWishlist());
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
  }, [refreshWishlist]);

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

        if (!current.some((item) => item.id === normalized.id)) {
          const next = [...current, normalized];
          writeGuestWishlist(next);
          setItems(next);
        }

        return;
      }

      const previous = items;
      if (!isInWishlist(normalized.id)) {
        setItems([...items, normalized]);
      }
      setIsSyncing(true);

      try {
        const next = await addBackendWishlistItem(normalized.id);
        setItems(next);
      } catch (cause) {
        setItems(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to add this product to your wishlist.",
        );
      } finally {
        setIsSyncing(false);
      }
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
        writeGuestWishlist(next);
        setItems(next);
        return;
      }

      const previous = items;
      setItems(items.filter((item) => item.id !== productId));
      setIsSyncing(true);

      try {
        const next = await removeBackendWishlistItem(productId);
        setItems(next);
      } catch (cause) {
        setItems(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to remove this product from your wishlist.",
        );
      } finally {
        setIsSyncing(false);
      }
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
      setItems([]);
      return;
    }

    const previous = items;
    setItems([]);
    setIsSyncing(true);

    try {
      await clearBackendWishlist();
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
