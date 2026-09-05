"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface WishlistProduct {
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

interface WishlistContextValue {
  items: WishlistProduct[];
  itemCount: number;
  isLoaded: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProduct) => void;
  addToWishlist: (product: WishlistProduct) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
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

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidProduct);
          setItems(valid);

          if (valid.length !== parsed.length) {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(valid),
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
      // Wishlist continues to work in memory.
    }
  }, [items, isLoaded]);

  const isInWishlist = useCallback(
    (productId: string) =>
      items.some((item) => item.id === productId),
    [items],
  );

  const addToWishlist = useCallback(
    (product: WishlistProduct) => {
      setItems((current) => {
        if (current.some((item) => item.id === product.id)) {
          return current;
        }

        return [...current, product];
      });
    },
    [],
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      setItems((current) =>
        current.filter((item) => item.id !== productId),
      );
    },
    [],
  );

  const toggleWishlist = useCallback(
    (product: WishlistProduct) => {
      setItems((current) => {
        const exists = current.some(
          (item) => item.id === product.id,
        );

        if (exists) {
          return current.filter(
            (item) => item.id !== product.id,
          );
        }

        return [...current, product];
      });
    },
    [],
  );

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      itemCount: items.length,
      isLoaded,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
    }),
    [
      items,
      isLoaded,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
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
    throw new Error(
      "useWishlist must be used within a WishlistProvider",
    );
  }

  return context;
}
