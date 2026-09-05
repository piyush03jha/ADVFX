"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconCheck,
  IconMinus,
  IconPlus,
  IconShoppingCart,
  IconSparkles,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import {
  useCart,
  type CartSize,
} from "@/context/CartContext";

import type { Product } from "@/config/products";

interface ProductActionsProps {
  product: Product;
}

const SIZES: Array<{
  id: CartSize;
  title: string;
}> = [
  {
    id: "small",
    title: "Small",
  },
  {
    id: "medium",
    title: "Medium",
  },
  {
    id: "large",
    title: "Large",
  },
];

export function ProductActions({
  product,
}: ProductActionsProps) {
  const router = useRouter();

  const [size, setSize] =
    useState<CartSize>("medium");

  const [quantity, setQuantity] =
    useState(1);

  const [added, setAdded] =
    useState(false);

  const { addItem } = useCart();

  const addToCart = () => {
    addItem(
      product,
      size,
      quantity,
    );

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1800);
  };

  const buyNow = () => {
    addItem(
      product,
      size,
      quantity,
    );

    router.push("/cart");
  };

  return (
    <div className="mt-7 w-full">
      {/* ==================================================
          SIZE
      ================================================== */}

      <div>
        <p
          className="
            mb-3
            text-[9px]
            font-medium
            uppercase
            tracking-[0.18em]
            text-primary
          "
        >
          Size
        </p>

        <div
          className="
            grid
            grid-cols-3
            gap-2
          "
        >
          {SIZES.map((item) => {
            const selected =
              size === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setSize(item.id)
                }
                className={`
                  relative
                  min-h-11
                  min-w-0
                  border
                  px-3
                  text-xs
                  font-medium
                  transition-all
                  duration-200
                  ${
                    selected
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-white/[0.08] bg-white/[0.015] text-foreground hover:border-primary/40"
                  }
                `}
              >
                {selected && (
                  <span
                    className="
                      absolute
                      right-2
                      top-2
                      flex
                      h-4
                      w-4
                      items-center
                      justify-center
                      rounded-full
                      bg-primary
                      text-white
                    "
                  >
                    <IconCheck size={9} />
                  </span>
                )}

                {item.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================
          QUANTITY
      ================================================== */}

      <div className="mt-5">
        <p
          className="
            mb-2
            text-[9px]
            font-medium
            uppercase
            tracking-[0.18em]
            text-primary
          "
        >
          Quantity
        </p>

        <div
          className="
            flex
            h-10
            w-28
            items-center
            justify-between
            border
            border-white/[0.08]
            bg-white/[0.015]
          "
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() =>
              setQuantity((value) =>
                Math.max(1, value - 1),
              )
            }
            className="
              flex
              h-full
              w-9
              items-center
              justify-center
              text-muted
              transition-colors
              hover:text-foreground
            "
          >
            <IconMinus size={13} />
          </button>

          <span
            className="
              min-w-4
              text-center
              text-xs
              font-medium
              text-foreground
            "
          >
            {quantity}
          </span>

          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() =>
              setQuantity(
                (value) => value + 1,
              )
            }
            className="
              flex
              h-full
              w-9
              items-center
              justify-center
              text-muted
              transition-colors
              hover:text-foreground
            "
          >
            <IconPlus size={13} />
          </button>
        </div>
      </div>

      {/* ==================================================
          BUY BUTTONS
      ================================================== */}

      <div
        className="
          mt-5
          grid
          grid-cols-1
          gap-2
          sm:grid-cols-2
        "
      >
        <Button
          type="button"
          onClick={addToCart}
          className="
            min-h-12
            bg-primary
            text-white
            shadow-[0_0_30px_var(--glow-primary)]
            hover:bg-primary-hover
          "
        >
          {added ? (
            <>
              <IconCheck size={17} />
              Added to cart
            </>
          ) : (
            <>
              <IconShoppingCart
                size={17}
              />
              Add to Cart
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={buyNow}
          className="
            flex
            min-h-12
            items-center
            justify-center
            gap-2
            rounded-full
            border
            border-primary/60
            bg-transparent
            px-5
            text-xs
            font-medium
            uppercase
            tracking-[0.14em]
            text-primary
            transition-all
            hover:bg-primary/8
          "
        >
          <IconSparkles size={15} />
          Buy Now
        </button>
      </div>
    </div>
  );
}