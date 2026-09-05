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

export type CartSize = "small" | "medium" | "large";

/**
 * Only the product fields the cart actually needs.
 * This lets product cards from different catalog sections
 * add items without forcing every catalog item to contain
 * the full product-detail schema.
 */
export interface CartProduct {
  id: string;
  name: string;
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

export interface CartItem {
  key: string;
  product: CartProduct;
  size: CartSize;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (
    product: Product | CartProduct,
    size?: CartSize,
    quantity?: number,
  ) => void;
  removeItem: (key: string) => void;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  isLoaded: boolean;
}

const STORAGE_KEY = "forma-cart";

const CartContext = createContext<CartContextValue | null>(null);

function getItemKey(productId: string, size: CartSize) {
  return `${productId}:${size}`;
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<CartItem>;
  const product = item.product as Partial<CartProduct> | undefined;

  return Boolean(
    item.key &&
      item.size &&
      ["small", "medium", "large"].includes(item.size) &&
      typeof item.quantity === "number" &&
      item.quantity > 0 &&
      product &&
      typeof product.id === "string" &&
      typeof product.name === "string" &&
      typeof product.category === "string" &&
      typeof product.price === "number" &&
      Number.isFinite(product.price) &&
      typeof product.image === "string",
  );
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          const validItems = parsed.filter(isValidCartItem);
          setItems(validItems);

          // Clean stale/corrupt cart data immediately.
          if (validItems.length !== parsed.length) {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(validItems),
            );
          }
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items),
      );
    } catch {
      // Ignore storage failures; cart still works in memory.
    }
  }, [items, isLoaded]);

  const addItem = useCallback(
    (
      product: Product | CartProduct,
      size: CartSize = "medium",
      quantity = 1,
    ) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const key = getItemKey(product.id, size);

      const cartProduct: CartProduct = {
        id: product.id,
        name: product.name,
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

      setItems((current) => {
        const existing = current.find(
          (item) => item.key === key,
        );

        if (existing) {
          return current.map((item) =>
            item.key === key
              ? {
                  ...item,
                  // Refresh product information in case catalog data changed.
                  product: cartProduct,
                  quantity: item.quantity + safeQuantity,
                }
              : item,
          );
        }

        return [
          ...current,
          {
            key,
            product: cartProduct,
            size,
            quantity: safeQuantity,
          },
        ];
      });
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((current) =>
      current.filter((item) => item.key !== key),
    );
  }, []);

  const incrementItem = useCallback((key: string) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  }, []);

  const decrementItem = useCallback((key: string) => {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.key !== key) return [item];

        if (item.quantity <= 1) return [];

        return [
          {
            ...item,
            quantity: item.quantity - 1,
          },
        ];
      }),
    );
  }, []);

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      const safeQuantity = Math.floor(quantity);

      if (safeQuantity <= 0) {
        removeItem(key);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: safeQuantity,
              }
            : item,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.product.price * item.quantity,
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
      isLoaded,
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
    throw new Error(
      "useCart must be used within a CartProvider",
    );
  }

  return context;
}
