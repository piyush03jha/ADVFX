import Link from "next/link";

import { Container } from "@/components/ui/Container";
import {
  CUSTOM_ORDER_STEPS,
  describeCatalog,
  ORDER_OPTIONS,
  PRODUCT_TYPES,
  READY_MADE_ORDER_STEPS,
} from "@/lib/aeo-content.mjs";

// Plain, server-rendered answers. Search engines and AI answer engines read this
// block directly, so it states the main facts about the shop in simple words.
// Headings are phrased as the questions people actually ask, and every fact is
// shared with /llms-full.txt and the HowTo schema through "@/lib/aeo-content.mjs".
interface HomeAboutProps {
  /** Number of active products currently listed in the catalog. */
  productCount: number;
  /** Category names taken from the live catalog. */
  categoryNames: string[];
}

const linkClass = "text-primary underline-offset-4 hover:underline";
const paragraphClass = "mt-4 text-sm leading-7 text-muted sm:text-base sm:leading-8";
const subheadingClass = "mt-10 font-serif text-xl tracking-[-0.03em] text-foreground sm:text-2xl";

export function HomeAbout({ productCount, categoryNames }: HomeAboutProps) {
  const catalogFact = describeCatalog(productCount, categoryNames);

  return (
    <section id="about-voxel3d" aria-labelledby="about-voxel3d-title" className="scroll-mt-28 py-10 sm:py-20 lg:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary sm:text-xs">
            About the shop
          </p>
          <h2
            id="about-voxel3d-title"
            className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-4xl"
          >
            What is Voxel3D?
          </h2>

          <p className={paragraphClass}>
            Voxel3D is an online shop in India where you can buy physical 3D printed models, anime figures,
            miniatures and collectibles. Every item in our{" "}
            <Link href="/shop" className={linkClass}>3D printed models shop</Link> is a real piece that is delivered
            to your home. We do not sell digital files to download.{" "}
            <a href="https://en.wikipedia.org/wiki/3D_printing" rel="noopener" className={linkClass}>3D printing</a>{" "}
            builds each model layer by layer from a digital design. Many products also have an interactive 3D preview
            in the open{" "}
            <a href="https://www.khronos.org/gltf/" rel="noopener" className={linkClass}>glTF</a>{" "}
            format, so you can turn the model on your screen and see it from every side before you buy.
          </p>

          {catalogFact && <p className={paragraphClass}>{catalogFact}</p>}

          <h3 className={subheadingClass}>What can you buy from Voxel3D?</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted marker:text-primary sm:text-base">
            {PRODUCT_TYPES.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>

          <h3 id="how-to-order" className={`${subheadingClass} scroll-mt-28`}>How does ordering a ready-made model work?</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted marker:font-semibold marker:text-primary sm:text-base">
            {READY_MADE_ORDER_STEPS.map((step) => (
              <li key={step.name}>
                <span className="font-semibold text-foreground">{step.name}.</span> {step.text}
              </li>
            ))}
          </ol>
          <p className={paragraphClass}>
            Online payments are processed through{" "}
            <a href="https://razorpay.com/" rel="noopener" className={linkClass}>Razorpay</a>. You can read our{" "}
            <Link href="/shipping" className={linkClass}>shipping and returns page</Link> and{" "}
            <Link href="/refund" className={linkClass}>refund policy</Link> before you order.
          </p>

          <h3 id="custom-order-steps" className={`${subheadingClass} scroll-mt-28`}>How does a custom 3D printed model work?</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted marker:font-semibold marker:text-primary sm:text-base">
            {CUSTOM_ORDER_STEPS.map((step) => (
              <li key={step.name}>
                <span className="font-semibold text-foreground">{step.name}.</span> {step.text}
              </li>
            ))}
          </ol>
          <p className={paragraphClass}>
            A custom request is reviewed by our team. The upload form is not an instant 3D generator, so the price
            and the time it takes are confirmed with you for your specific model. You can{" "}
            <Link href="/custom" className={linkClass}>start a custom 3D model request</Link> or{" "}
            <Link href="/contact" className={linkClass}>contact the Voxel3D team</Link> if you have a question first.
          </p>

          <h3 className={subheadingClass}>What is the difference between ready-made, custom and bulk orders?</h3>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm leading-6">
              <caption className="sr-only">Comparison of ready-made, custom and bulk orders at Voxel3D</caption>
              <thead className="bg-surface text-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Order type</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Best for</th>
                  <th scope="col" className="px-4 py-3 font-semibold">What you provide</th>
                  <th scope="col" className="px-4 py-3 font-semibold">What happens next</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {ORDER_OPTIONS.map((row) => (
                  <tr key={row.option} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-3 font-semibold text-foreground">{row.option}</th>
                    <td className="px-4 py-3">{row.bestFor}</td>
                    <td className="px-4 py-3">{row.youProvide}</td>
                    <td className="px-4 py-3">{row.nextStep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className={subheadingClass}>Is a Voxel3D product a physical item or a digital file?</h3>
          <p className={paragraphClass}>
            Every product is a physical item. Voxel3D does not sell customer downloads of digital 3D files. Product
            pages show the photos, details and price of each item, and our{" "}
            <Link href="/care" className={linkClass}>model care guide</Link> explains how to look after your model.
          </p>

          <h3 className={subheadingClass}>Does Voxel3D ship across India?</h3>
          <p className={paragraphClass}>
            Yes. Voxel3D is set up for physical orders shipped across India. Shipping charges and delivery options
            are shown at checkout, and estimated delivery windows are not guarantees because production time and
            carrier capacity can change them. For more answers, read the{" "}
            <Link href="/faq" className={linkClass}>frequently asked questions</Link> or learn{" "}
            <Link href="/about" className={linkClass}>about the Voxel3D team</Link>.
          </p>
        </div>
      </Container>
    </section>
  );
}
