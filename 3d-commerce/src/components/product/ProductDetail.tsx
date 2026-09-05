import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import type { Product } from "@/config/products";

import { ProductBreadcrumb } from "./ProductBreadcrumb";
import { ProductDetailsTabs } from "./ProductDetailsTabs";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";
import { RelatedProducts } from "./RelatedProducts";

import {
  IconClock,
  IconShieldCheck,
  IconTruckDelivery,
} from "@tabler/icons-react";

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetail({
  product,
  relatedProducts,
}: ProductDetailProps) {
  return (
    <main className="w-full overflow-hidden">
      {/* =====================================================
          PRODUCT HERO
      ====================================================== */}

      <Section
        className="
          relative
          pt-10
          sm:pt-8
          lg:pt-14
        "
        glow
      >
        {/* Ambient glow */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-[420px]
            w-[420px]
            -translate-x-1/2
            rounded-full
            bg-primary/8
            blur-[120px]
            sm:h-[520px]
            sm:w-[520px]
            sm:blur-[140px]
          "
        />

        <Container>
          {/* =================================================
              BREADCRUMB
          ================================================= */}

          <ProductBreadcrumb
            category={product.category}
            productName={product.name}
          />

          {/* =================================================
              PRODUCT GRID
          ================================================= */}

          <div
            className="
              relative
              mt-4
              grid
              grid-cols-1
              gap-7
              sm:mt-5
              sm:gap-8
              lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]
              lg:gap-10
              xl:gap-14
            "
          >
            {/* =================================================
                LEFT — PRODUCT GALLERY
            ================================================= */}

            <div
              className="
                min-w-0
                w-full
              "
            >
              <ProductGallery
                product={product}
              />
            </div>

            {/* =================================================
                RIGHT — PRODUCT INFORMATION
            ================================================= */}

            <div
              className="
                min-w-0
                w-full
                lg:sticky
                lg:top-24
                lg:self-start
              "
            >
              <ProductInfo
                product={product}
              />
            </div>
          </div>

          {/* =================================================
              SHIPPING / TRUST INFORMATION
          ================================================= */}

          <div
            className="
              mt-5
              grid
              grid-cols-3
              overflow-hidden
              border-y
              border-white/[0.07]
              sm:mt-7
            "
          >
            <Benefit
              icon={
                <IconTruckDelivery
                  size={14}
                />
              }
              title="Free shipping over ₹4,999"
            />

            <Benefit
              icon={
                <IconShieldCheck
                  size={14}
                />
              }
              title="Authenticity guaranteed"
            />

            <Benefit
              icon={
                <IconClock
                  size={14}
                />
              }
              title="Ships in 2–3 business days"
            />
          </div>
        </Container>
      </Section>

      {/* =====================================================
          DESCRIPTION / SPECS / REVIEWS
      ====================================================== */}

      <Section
        className="
          pt-6
          sm:pt-8
          lg:pt-10
        "
      >
        <Container>
          <ProductDetailsTabs
            product={product}
          />

          {/* =================================================
              RELATED PRODUCTS
          ================================================= */}

          {relatedProducts.length > 0 && (
            <div
              className="
                mt-10
                sm:mt-14
                lg:mt-16
              "
            >
              <RelatedProducts
                products={relatedProducts}
              />
            </div>
          )}
        </Container>
      </Section>
    </main>
  );
}

/* ============================================================
   SHIPPING / TRUST BENEFIT
============================================================ */

function Benefit({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        justify-center
        gap-1
        border-r
        border-white/[0.07]
        px-1
        py-3
        last:border-r-0
        sm:gap-2
        sm:px-3
        sm:py-4
        lg:px-5
      "
    >
      {/* Icon */}

      <span
        className="
          flex
          shrink-0
          items-center
          justify-center
          text-primary
        "
      >
        {icon}
      </span>

      {/* Text */}

      <span
        className="
          min-w-0
          truncate
          whitespace-nowrap
          text-[7px]
          font-medium
          uppercase
          tracking-[0.025em]
          text-muted
          sm:text-[9px]
          sm:tracking-[0.05em]
          lg:text-[10px]
          lg:tracking-[0.07em]
        "
        title={title}
      >
        {title}
      </span>
    </div>
  );
}