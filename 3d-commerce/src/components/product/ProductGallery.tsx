"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconRotate,
} from "@tabler/icons-react";

import type { Product } from "@/config/products";

import { IconButton } from "@/components/ui/IconButton";

const Product3DStage = dynamic(
  () => import("./Product3DStage"),
  {
    ssr: false,
    loading: () => (
      <div
        className="
          flex
          h-full
          w-full
          items-center
          justify-center
          bg-[#09090b]
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              h-7
              w-7
              animate-spin
              rounded-full
              border
              border-white/10
              border-t-primary
            "
          />

          <p
            className="
              mt-3
              text-[9px]
              uppercase
              tracking-[0.18em]
              text-muted
            "
          >
            Preparing 3D viewer
          </p>
        </div>
      </div>
    ),
  },
);

interface ProductGalleryProps {
  product: Product;
}

type MediaItem =
  | {
      type: "image";
      src: string;
      label: string;
    }
  | {
      type: "model";
      src: string;
      label: string;
    };

export function ProductGallery({
  product,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] =
    useState(0);

  const [imageSrc, setImageSrc] =
    useState(product.image);

  const fallbackImage =
    `/catogeries/${
      Number(product.id) >= 1 &&
      Number(product.id) <= 4
        ? product.id
        : "1"
    }.jpg`;

  const media: MediaItem[] = [
    {
      type: "image",
      src: imageSrc,
      label: "Preview",
    },
    {
      type: "model",
      src: product.model,
      label: "Interactive 3D",
    },
    {
      type: "image",
      src: imageSrc,
      label: "Detail 01",
    },
    {
      type: "image",
      src: imageSrc,
      label: "Detail 02",
    },
  ];

  const active = media[activeIndex];

  const previous = () => {
    setActiveIndex(
      (current) =>
        (current - 1 + media.length) %
        media.length,
    );
  };

  const next = () => {
    setActiveIndex(
      (current) =>
        (current + 1) % media.length,
    );
  };

  const openFullscreen = () => {
    const element =
      document.getElementById(
        "product-media-stage",
      );

    if (!element) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    element.requestFullscreen?.();
  };

  return (
    <div className="min-w-0 w-full">
      {/* ==================================================
          MAIN STAGE
      ================================================== */}

      <div
        id="product-media-stage"
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          rounded-[22px]
          border
          border-white/[0.08]
          bg-[#08080a]
          shadow-[0_30px_100px_rgba(0,0,0,0.28)]
          sm:rounded-[28px]
        "
      >
        {/* Background glow */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.16),transparent_58%)]
          "
        />

        {/* ==================================================
            TOP CONTROLS
        ================================================== */}

        <div
          className="
            absolute
            right-3
            top-3
            z-30
            flex
            gap-1.5
            sm:right-4
            sm:top-4
            sm:gap-2
          "
        >
          <IconButton
            label="Previous image"
            size="sm"
            variant="default"
            onClick={previous}
            className="
              border-white/10
              bg-black/45
              text-white/80
              backdrop-blur-xl
              hover:bg-black/65
              hover:text-white
            "
          >
            <IconChevronLeft size={15} />
          </IconButton>

          <IconButton
            label="Next image"
            size="sm"
            variant="default"
            onClick={next}
            className="
              border-white/10
              bg-black/45
              text-white/80
              backdrop-blur-xl
              hover:bg-black/65
              hover:text-white
            "
          >
            <IconChevronRight size={15} />
          </IconButton>

          <IconButton
            label="Fullscreen"
            size="sm"
            variant="default"
            onClick={openFullscreen}
            className="
              border-white/10
              bg-black/45
              text-white/80
              backdrop-blur-xl
              hover:bg-black/65
              hover:text-white
            "
          >
            <IconMaximize size={14} />
          </IconButton>
        </div>

        {/* ==================================================
            COUNTER
        ================================================== */}

        <div
          className="
            absolute
            left-3
            top-3
            z-30
            rounded-full
            border
            border-white/10
            bg-black/40
            px-2.5
            py-1.5
            text-[8px]
            uppercase
            tracking-[0.16em]
            text-white/55
            backdrop-blur-xl
            sm:left-4
            sm:top-4
            sm:px-3
          "
        >
          {String(activeIndex + 1).padStart(
            2,
            "0",
          )}{" "}
          /{" "}
          {String(media.length).padStart(
            2,
            "0",
          )}
        </div>

        {/* ==================================================
            IMAGE
        ================================================== */}

        {active.type === "image" && (
          <div className="absolute inset-0">
            <Image
              src={active.src}
              alt={`${product.name} — ${active.label}`}
              fill
              priority={activeIndex === 0}
              sizes="
                (max-width: 640px) 100vw,
                (max-width: 1024px) 100vw,
                60vw
              "
              className="
                object-contain
                p-5
                sm:p-10
                lg:p-16
              "
              onError={() => {
                if (
                  imageSrc !== fallbackImage
                ) {
                  setImageSrc(
                    fallbackImage,
                  );
                }
              }}
            />
          </div>
        )}

        {/* ==================================================
            3D VIEW
        ================================================== */}

        {active.type === "model" && (
          <>
            <Product3DStage
              model={product.model}
              name={product.name}
            />

            {/* Desktop instruction */}

            <div
              className="
                pointer-events-none
                absolute
                bottom-4
                left-4
                z-20
                hidden
                items-center
                gap-2
                rounded-full
                border
                border-white/10
                bg-black/45
                px-3
                py-2
                text-[9px]
                uppercase
                tracking-[0.14em]
                text-white/55
                backdrop-blur-xl
                sm:flex
              "
            >
              <IconRotate size={12} />
              Drag to rotate · Scroll to zoom
            </div>
          </>
        )}

        {/* ==================================================
            ACTIVE MEDIA LABEL
        ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            bottom-3
            left-1/2
            z-20
            max-w-[calc(100%-24px)]
            -translate-x-1/2
            truncate
            rounded-full
            border
            border-white/10
            bg-black/45
            px-3
            py-1.5
            text-center
            text-[8px]
            uppercase
            tracking-[0.14em]
            text-white/55
            backdrop-blur-xl
            sm:bottom-4
            sm:left-auto
            sm:right-4
            sm:max-w-none
            sm:translate-x-0
            sm:px-3
            sm:py-2
          "
        >
          {active.label}
        </div>

        {/* Mobile interaction hint */}

        {active.type === "model" && (
          <div
            className="
              pointer-events-none
              absolute
              bottom-12
              left-1/2
              z-20
              -translate-x-1/2
              whitespace-nowrap
              rounded-full
              bg-black/30
              px-2.5
              py-1
              text-[7px]
              uppercase
              tracking-[0.12em]
              text-white/35
              sm:hidden
            "
          >
            Drag to rotate · Pinch to zoom
          </div>
        )}
      </div>

      {/* ==================================================
          THUMBNAILS
      ================================================== */}

      <div
        className="
          mt-3
          grid
          grid-cols-4
          gap-2
          sm:gap-3
        "
      >
        {media.map((item, index) => {
          const selected =
            index === activeIndex;

          return (
            <button
              key={`${item.label}-${index}`}
              type="button"
              onClick={() =>
                setActiveIndex(index)
              }
              aria-label={`View ${item.label}`}
              className={`
                group
                relative
                aspect-[4/3]
                min-w-0
                overflow-hidden
                rounded-xl
                border
                transition-all
                duration-200
                ${
                  selected
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-white/[0.08] hover:border-primary/35"
                }
              `}
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="
                    (max-width: 640px) 25vw,
                    15vw
                  "
                  className="
                    object-cover
                    opacity-80
                    transition
                    duration-300
                    group-hover:scale-105
                    group-hover:opacity-100
                  "
                  onError={() => {
                    if (
                      imageSrc !== fallbackImage
                    ) {
                      setImageSrc(
                        fallbackImage,
                      );
                    }
                  }}
                />
              ) : (
                <div
                  className="
                    flex
                    h-full
                    w-full
                    items-center
                    justify-center
                    bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_65%)]
                  "
                >
                  <span
                    className="
                      rounded-full
                      border
                      border-primary/30
                      bg-primary/8
                      px-2
                      py-1
                      text-[7px]
                      uppercase
                      tracking-[0.12em]
                      text-primary
                      sm:px-3
                      sm:py-1.5
                      sm:text-[8px]
                    "
                  >
                    3D View
                  </span>
                </div>
              )}

              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  truncate
                  bg-black/45
                  px-1.5
                  py-1.5
                  text-left
                  text-[7px]
                  uppercase
                  tracking-[0.08em]
                  text-white/65
                  backdrop-blur-sm
                  sm:px-2
                  sm:text-[8px]
                  sm:tracking-[0.12em]
                "
              >
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}