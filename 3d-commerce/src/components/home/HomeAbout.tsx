import Link from "next/link";

import { Container } from "@/components/ui/Container";

/**
 * Server-rendered, crawlable copy for the homepage. The hero and product rows load
 * client-side, so this gives search engines real text about what Voxel3D is and sells.
 */
export function HomeAbout() {
  return (
    <section aria-labelledby="about-voxel3d" className="border-t border-border py-14 sm:py-20">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">About Voxel3D</p>
          <h2 id="about-voxel3d" className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
            Premium 3D printed models and collectibles, made to order in India
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-7 text-muted sm:text-base">
            <p>
              Voxel3D is an Indian studio that designs, prints and finishes physical 3D printed models. Every
              piece in our <Link href="/shop" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">3D printed collectibles shop</Link>{" "}
              is produced after you order, so each figure is checked for detail, surface quality and finish before
              it is packed and shipped to your door anywhere in India.
            </p>
            <p>
              Our catalog covers character figures, display models, desk pieces and gift-ready collectibles. Open
              any product page to rotate the model in an interactive 3D viewer, compare available sizes and see the
              material, scale and dimensions before you buy. Products are physical items, not downloadable files.
            </p>
          </div>

          <h3 className="mt-10 text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
            Custom 3D printing from your own reference
          </h3>
          <div className="mt-3 space-y-4 text-sm leading-7 text-muted sm:text-base">
            <p>
              Want something that does not exist yet? Send reference images and your requirements through the{" "}
              <Link href="/custom" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">custom 3D model request form</Link>.
              We review the brief, model the piece, agree the size and price with you, and then print and finish it.
              Custom work suits personal gifts, gaming and anime characters, pets, trophies and branded display
              items.
            </p>
          </div>

          <h3 className="mt-10 text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
            How ordering works
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-muted sm:text-base">
            <li>Browse the collection or start a custom request and choose your size.</li>
            <li>Pay securely online with Razorpay; shipping is calculated at checkout.</li>
            <li>We print, finish and inspect your model, then dispatch it with protective packaging.</li>
            <li>Track your order from your account and contact support if you need help.</li>
          </ol>

          <p className="mt-8 text-sm leading-7 text-muted sm:text-base">
            Need details first? Read our{" "}
            <Link href="/faq" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">frequently asked questions</Link>,
            the <Link href="/shipping" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">shipping information</Link>,
            the <Link href="/care" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">care guide for 3D printed models</Link>{" "}
            or <Link href="/contact" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">contact the Voxel3D team</Link>.
          </p>
        </div>
      </Container>
    </section>
  );
}
