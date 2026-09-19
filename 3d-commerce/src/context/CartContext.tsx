"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Product } from "@/config/products";
import type { StorefrontVariant } from "@/lib/catalog-api";
import { useAuth } from "@/context/AuthContext";

export type CartSize = string;

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  currency?: string;
  image: string;
  oldPrice?: number;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  discount?: string;
  model?: string;
}

export interface CartItem {
  key: string;
  product: CartProduct;
  variantId: string | null;
  variantName: string | null;
  variantSize: string | null;
  size: string;
  quantity: number;
}

export interface BackendCartProduct {
  id: string;
  name: string;
  slug?: string;
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
}

export interface BackendCartVariant {
  id: string;
  name: string;
  size?: string | null;
  isActive: boolean;
  price?: {
    id: string;
    currency: string;
    amountMinor: number;
    compareAtMinor?: number | null;
    isActive: boolean;
  } | null;
}

export interface BackendCartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  variant?: BackendCartVariant | null;
  quantity: number;
  product: BackendCartProduct;
}

export interface BackendCart {
  id: string;
  items: BackendCartItem[];
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (
    product: Product | CartProduct,
    variantOrSize?: StorefrontVariant | CartSize | null,
    quantity?: number,
  ) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  incrementItem: (key: string) => Promise<void>;
  decrementItem: (key: string) => Promise<void>;
  updateQuantity: (key: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isLoaded: boolean;
  isSyncing: boolean;
  error: string | null;
}

interface GuestCartItem {
  product: CartProduct;
  variantId: string | null;
  variantName: string | null;
  variantSize: string | null;
  size: string;
  quantity: number;
}

const GUEST_STORAGE_KEY = "forma-cart";

const CartContext = createContext<CartContextValue | null>(null);

function getItemKey(
  productId: string,
  variantId: string | null,
  legacySize = "base",
) {
  return productId + ":" + (variantId ?? legacySize);
}

function getDisplaySize(variant?: StorefrontVariant | null) {
  return variant?.size ?? variant?.name ?? "Standard";
}

function getLocalGuestCart(): GuestCartItem[] {
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is GuestCartItem => {
      if (!value || typeof value !== "object") return false;

      const item = value as Partial<GuestCartItem>;
      const product = item.product as Partial<CartProduct> | undefined;

      return Boolean(
        product &&
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.category === "string" &&
          typeof product.price === "number" &&
          Number.isFinite(product.price) &&
          typeof product.image === "string" &&
          typeof item.quantity === "number" &&
          item.quantity > 0 &&
          typeof item.size === "string",
      );
    });
  } catch {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
    return [];
  }
}

function setLocalGuestCart(items: GuestCartItem[]) {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Guest cart persistence is best-effort.
  }
}

function clearLocalGuestCart() {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function normalizeBackendImage(product: BackendCartProduct) {
  return (
    product.media?.find(
      (media) => media.type === "IMAGE" && media.isPrimary,
    )?.url ??
    product.media?.find((media) => media.type === "IMAGE")?.url ??
    "/catogeries/1.jpg"
  );
}

function normalizeBackendModel(product: BackendCartProduct) {
  return (
    product.media?.find(
      (media) => media.type === "MODEL_PREVIEW" && media.isPrimary,
    )?.url ??
    product.media?.find((media) => media.type === "MODEL_PREVIEW")?.url ??
    ""
  );
}

function activeBackendPrice(product: BackendCartProduct) {
  return (
    product.prices?.find(
      (price) => price.currency === "INR" && price.isActive,
    ) ??
    product.prices?.find((price) => price.isActive) ??
    product.prices?.[0]
  );
}

function mapBackendCartItem(item: BackendCartItem): CartItem {
  const variant = item.variant ?? null;
  const variantPrice =
    variant?.isActive && variant.price?.isActive ? variant.price : null;
  const basePrice = activeBackendPrice(item.product);
  const selectedPrice = variantPrice ?? basePrice;
  const amount = selectedPrice?.amountMinor ?? 0;
  const compareAt = selectedPrice?.compareAtMinor ?? undefined;
  const size = variant?.size ?? variant?.name ?? "Standard";

  const product: CartProduct = {
    id: item.product.id,
    name: item.product.name,
    category: item.product.category?.name ?? "Uncategorized",
    price: amount / 100,
    currency: selectedPrice?.currency ?? "INR",
    image: normalizeBackendImage(item.product),
    oldPrice: compareAt !== undefined ? compareAt / 100 : undefined,
    rating: 0,
    reviewCount: 0,
    model: normalizeBackendModel(item.product),
    discount:
      compareAt !== undefined && compareAt > amount
        ? Math.round(((compareAt - amount) / compareAt) * 100) + "% OFF"
        : undefined,
  };

  return {
    key: getItemKey(item.productId, item.variantId ?? null),
    product,
    variantId: item.variantId ?? null,
    variantName: variant?.name ?? null,
    variantSize: variant?.size ?? null,
    size,
    quantity: item.quantity,
  };
}

async function readBackendCart(): Promise<BackendCart> {
  const response = await fetch("/api/cart", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(body?.error ?? "Unable to load your cart.");
  }

  return (await response.json()) as BackendCart;
}

async function mutateBackendCart(
  path: string,
  init: RequestInit,
): Promise<BackendCart> {
  const response = await fetch("/api/cart" + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => null)) as
    | BackendCart
    | { message?: string | string[]; error?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray(data.message)
          ? data.message[0]
          : data.message
        : data && typeof data === "object" && "error" in data
          ? data.error
          : undefined;

    throw new Error(message ?? "Unable to update your cart.");
  }

  return data as BackendCart;
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyBackendCart = useCallback((cart: BackendCart) => {
    setItems(cart.items.map(mapBackendCartItem));
  }, []);

  const syncGuestCart = useCallback(async () => {
    const guestItems = getLocalGuestCart();

    if (guestItems.length === 0) {
      applyBackendCart(await readBackendCart());
      return;
    }

    const backendCart = await readBackendCart();
    const backendQuantities = new Map(
      backendCart.items.map((item) => [
        getItemKey(
          item.productId,
          item.variantId ?? null,
        ),
        item.quantity,
      ]),
    );

    for (const item of guestItems) {
      const key = getItemKey(item.product.id, item.variantId, item.size);
      const existingQuantity = backendQuantities.get(key) ?? 0;

      await mutateBackendCart("/items", {
        method: "POST",
        body: JSON.stringify({
          productId: item.product.id,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        }),
      });

      backendQuantities.set(key, existingQuantity + item.quantity);
    }

    clearLocalGuestCart();
    applyBackendCart(await readBackendCart());
  }, [applyBackendCart]);

  const refreshCart = useCallback(async () => {
    setError(null);

    try {
      if (isAuthenticated) {
        await syncGuestCart();
        return;
      }

      const guestItems = getLocalGuestCart();

      setItems(
        guestItems.map((item) => ({
          key: getItemKey(item.product.id, item.variantId, item.size),
          product: item.product,
          variantId: item.variantId,
          variantName: item.variantName,
          variantSize: item.variantSize,
          size: item.size,
          quantity: item.quantity,
        })),
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to load your cart.";
      setError(message);
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated, syncGuestCart]);

  useEffect(() => {
    if (isAuthLoading) return;
    void refreshCart();
  }, [isAuthLoading, refreshCart]);

  const addItem = useCallback(
    async (
      product: Product | CartProduct,
      variantOrSize: StorefrontVariant | CartSize | null = null,
      quantity = 1,
    ) => {
      const variant =
        variantOrSize && typeof variantOrSize === "object"
          ? variantOrSize
          : null;
      const legacySize =
        typeof variantOrSize === "string" ? variantOrSize : "Standard";
      const safeQuantity = Math.min(99, Math.max(1, Math.floor(quantity)));
      const variantId = variant?.id ?? null;
      const size = variant ? getDisplaySize(variant) : legacySize;

      setError(null);

      if (isAuthenticated) {
        setIsSyncing(true);

        try {
          const backendCart = await mutateBackendCart("/items", {
            method: "POST",
            body: JSON.stringify({
              productId: product.id,
              variantId: variantId ?? undefined,
              quantity: safeQuantity,
            }),
          });

          applyBackendCart(backendCart);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to add this item.",
          );
        } finally {
          setIsSyncing(false);
        }

        return;
      }

      const next = [...getLocalGuestCart()];
      const existing = next.find(
        (item) =>
          item.product.id === product.id &&
          item.variantId === variantId,
      );

      const guestProduct: CartProduct = {
        id: product.id,
        name: product.name,
        category: product.category,
        price: variant?.price ?? product.price,
        image: product.image,
        oldPrice: variant?.oldPrice ?? product.oldPrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        badge: product.badge,
        discount: product.discount,
        model: product.model,
      };

      if (existing) {
        existing.product = guestProduct;
        existing.variantId = variantId;
        existing.variantName = variant?.name ?? null;
        existing.variantSize = variant?.size ?? null;
        existing.size = size;
        existing.quantity += safeQuantity;
      } else {
        next.push({
          product: guestProduct,
          variantId,
          variantName: variant?.name ?? null,
          variantSize: variant?.size ?? null,
          size,
          quantity: safeQuantity,
        });
      }

      setLocalGuestCart(next);
      setItems(
        next.map((item) => ({
          key: getItemKey(item.product.id, item.variantId, item.size),
          product: item.product,
          variantId: item.variantId,
          variantName: item.variantName,
          variantSize: item.variantSize,
          size: item.size,
          quantity: item.quantity,
        })),
      );
    },
    [applyBackendCart, isAuthenticated],
  );

  const updateBackendQuantity = useCallback(
    async (key: string, quantity: number) => {
      const [productId, variantKey] = key.split(":");
      const variantId =
        variantKey && variantKey !== "base" ? variantKey : null;

      const backendCart = await mutateBackendCart(
        "/items/" + encodeURIComponent(productId),
        {
          method: "PATCH",
          body: JSON.stringify({
            productId,
            variantId: variantId ?? undefined,
            quantity,
          }),
        },
      );

      applyBackendCart(backendCart);
    },
    [applyBackendCart],
  );

  const removeItem = useCallback(
    async (key: string) => {
      setError(null);

      if (isAuthenticated) {
        setIsSyncing(true);

        try {
          const [productId, variantKey] = key.split(":");
          const variantId =
            variantKey && variantKey !== "base" ? variantKey : null;

          const query =
            variantId !== null
              ? "?variantId=" + encodeURIComponent(variantId)
              : "";

          const backendCart = await mutateBackendCart(
            "/items/" + encodeURIComponent(productId) + query,
            { method: "DELETE" },
          );

          applyBackendCart(backendCart);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to remove this item.",
          );
        } finally {
          setIsSyncing(false);
        }

        return;
      }

      const next = getLocalGuestCart().filter(
        (item) =>
          getItemKey(item.product.id, item.variantId, item.size) !== key,
      );

      setLocalGuestCart(next);
      setItems(
        next.map((item) => ({
          key: getItemKey(item.product.id, item.variantId, item.size),
          product: item.product,
          variantId: item.variantId,
          variantName: item.variantName,
          variantSize: item.variantSize,
          size: item.size,
          quantity: item.quantity,
        })),
      );
    },
    [applyBackendCart, isAuthenticated],
  );

  const updateQuantity = useCallback(
    async (key: string, quantity: number) => {
      const safeQuantity = Math.floor(quantity);

      if (safeQuantity <= 0) {
        await removeItem(key);
        return;
      }

      if (isAuthenticated) {
        setIsSyncing(true);
        setError(null);

        try {
          await updateBackendQuantity(key, safeQuantity);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to update quantity.",
          );
        } finally {
          setIsSyncing(false);
        }

        return;
      }

      const next = getLocalGuestCart().map((item) =>
        getItemKey(item.product.id, item.variantId, item.size) === key
          ? { ...item, quantity: safeQuantity }
          : item,
      );

      setLocalGuestCart(next);
      setItems(
        next.map((item) => ({
          key: getItemKey(item.product.id, item.variantId, item.size),
          product: item.product,
          variantId: item.variantId,
          variantName: item.variantName,
          variantSize: item.variantSize,
          size: item.size,
          quantity: item.quantity,
        })),
      );
    },
    [isAuthenticated, removeItem, updateBackendQuantity],
  );

  const incrementItem = useCallback(
    async (key: string) => {
      const current = items.find((item) => item.key === key);
      if (!current) return;
      await updateQuantity(key, current.quantity + 1);
    },
    [items, updateQuantity],
  );

  const decrementItem = useCallback(
    async (key: string) => {
      const current = items.find((item) => item.key === key);
      if (!current) return;
      await updateQuantity(key, current.quantity - 1);
    },
    [items, updateQuantity],
  );

  const clearCart = useCallback(async () => {
    setError(null);

    if (isAuthenticated) {
      setIsSyncing(true);

      try {
        const backendCart = await mutateBackendCart("/", {
          method: "DELETE",
        });
        applyBackendCart(backendCart);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to clear your cart.",
        );
      } finally {
        setIsSyncing(false);
      }

      return;
    }

    clearLocalGuestCart();
    setItems([]);
  }, [applyBackendCart, isAuthenticated]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      ),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      incrementItem,
      decrementItem,
      updateQuantity,
      clearCart,
      refreshCart,
      isLoaded,
      isSyncing,
      error,
    }),
    [
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      incrementItem,
      decrementItem,
      updateQuantity,
      clearCart,
      isLoaded,
      isSyncing,
      error,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
