import Link from "next/link";

import { Container } from "@/components/ui/Container";

// Plain, server-rendered text. Search engines and AI answer engines read this
// block directly, so it states the main facts about the shop in simple words.
// Each paragraph is kept to roughly 134-167 words, a length that is easy for
// AI tools to quote as one complete answer.
export function HomeAbout() {
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
            Buy 3D printed models and collectibles in India
          </h2>

          <p className="mt-5 text-sm leading-7 text-muted sm:text-base sm:leading-8">
            Voxel3D is an online shop in India where you can buy 3D printed models and collectibles. Every item in
            our <Link href="/shop" className="text-primary underline-offset-4 hover:underline">3D printed models shop</Link> is
            a real, physical piece. We do not sell digital files to download. You can browse anime figures,
            miniatures, character models and display pieces for your desk or shelf. Then you can order them and have
            them delivered to your home in India. Many products have a 3D preview, so you can turn the model on your
            screen and see it from every side before you buy. Each product page shows photos, details and the price
            of that item. If you want to know more before you order, you can read our{" "}
            <Link href="/faq" className="text-primary underline-offset-4 hover:underline">frequently asked questions</Link>, our{" "}
            <Link href="/shipping" className="text-primary underline-offset-4 hover:underline">shipping and returns page</Link> and
            our <Link href="/care" className="text-primary underline-offset-4 hover:underline">model care guide</Link>.
            These pages explain how delivery works, how to look after your model, and what to do if something is
            wrong with your order.
          </p>

          <p className="mt-5 text-sm leading-7 text-muted sm:text-base sm:leading-8">
            Cannot find the figure you want? You can ask us to make a custom 3D printed model. Send clear photos
            from different sides, tell us the size you want, and add any details that matter to you. Our team reads
            your request, tells you what is possible, and confirms the order details with you before we start. We
            then make the physical model and send it to you. Custom orders work well for gifts and for favourite
            characters. If you need many pieces for a team, an event, a shop or a business, you can ask for a bulk
            order. Tell us how many you need, the size, and the date you need them by. We will talk with you about
            the plan, the price and the time it will take. You can{" "}
            <Link href="/custom" className="text-primary underline-offset-4 hover:underline">start a custom 3D model request</Link>{" "}
            or <Link href="/contact" className="text-primary underline-offset-4 hover:underline">contact the Voxel3D team</Link> to begin.
          </p>
        </div>
      </Container>
    </section>
  );
}
