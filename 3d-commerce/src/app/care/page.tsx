import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconCheck,
  IconDroplet,
  IconSun,
  IconTemperature,
  IconSparkles,
  IconMessageCircle,
} from "@tabler/icons-react";
import { Navbar } from "@/components/layout/SiteNavbar";

export const metadata: Metadata = {
  title: "Care Guide",
  description: "Simple care and handling guidance for Voxel3D physical 3D-printed products and collectibles.",
  alternates: { canonical: "/care" },
};

const careItems = [
  {
    icon: IconSparkles,
    category: "Cleaning",
    title: "Clean gently",
    body: "Use a soft, clean cloth to remove dust. If needed, lightly dampen the cloth with water and wipe gently.",
    avoid: "Abrasive pads, aggressive scrubbing and harsh cleaning chemicals.",
  },
  {
    icon: IconTemperature,
    category: "Temperature",
    title: "Avoid excessive heat",
    body: "Keep your model away from heaters, hot surfaces and enclosed spaces that become extremely hot. Heat can affect some 3D-printed materials.",
    avoid: "High-heat sources and very hot enclosed spaces.",
  },
  {
    icon: IconSun,
    category: "Display",
    title: "Limit direct sunlight",
    body: "For the best long-term appearance, keep your model out of strong direct sunlight for extended periods. Light and heat can affect some finishes and materials over time.",
    avoid: "Prolonged exposure to strong direct sunlight.",
  },
  {
    icon: IconDroplet,
    category: "Moisture",
    title: "Keep it dry",
    body: "Avoid prolonged exposure to water or moisture unless the product information specifically says otherwise.",
    avoid: "Soaking or submerging the model.",
  },
  {
    icon: IconBox,
    category: "Handling & storage",
    title: "Handle and store carefully",
    body: "Support the model by its stronger main body rather than thin or delicate details. When storing or moving it, use suitable protective packaging.",
    avoid: "Holding delicate details or placing heavy objects on top.",
  },
];

const essentials = [
  { icon: IconSparkles, text: "Soft cloth, gentle cleaning" },
  { icon: IconTemperature, text: "Away from excessive heat" },
  { icon: IconDroplet, text: "Dry, protected storage" },
];

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function CareGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-[1200px] px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-primary">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-foreground">Care guide</span>
        </nav>

        <section aria-labelledby="care-heading" className="relative isolate overflow-hidden rounded-[2rem] border border-border bg-surface px-6 py-8 sm:px-9 sm:py-11 lg:px-12 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--primary)_13%,transparent),transparent_60%)]" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <IconSparkles size={14} stroke={1.7} aria-hidden="true" />
                Voxel3D care guide
              </p>
              <h1 id="care-heading" className="mt-5 max-w-xl font-serif text-[2.65rem] leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-[4.3rem]">
                Made to be enjoyed.
                <span className="mt-1 block text-muted">Care for it well.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted sm:text-base">
                A few simple habits will help keep your physical 3D-printed model clean, protected and looking its best.
              </p>
              <a href="#care-instructions" className={actionClass + " mt-6 bg-foreground text-background hover:bg-primary hover:text-white"}>
                Explore care tips <IconArrowRight size={16} stroke={1.8} aria-hidden="true" />
              </a>
            </div>

            <aside aria-label="Care essentials" className="rounded-3xl border border-border bg-background/65 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <IconBox size={25} stroke={1.5} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">At a glance</p>
                  <h2 className="mt-1 text-lg font-semibold">The essentials</h2>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-border/70">
                {essentials.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 py-3 text-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-muted">
                      <Icon size={18} stroke={1.6} aria-hidden="true" />
                    </span>
                    <span className="flex-1">{text}</span>
                    <IconCheck size={16} stroke={1.8} className="shrink-0 text-primary" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section id="care-instructions" aria-labelledby="instructions-heading" className="mt-12 scroll-mt-28 sm:mt-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Everyday maintenance</p>
              <h2 id="instructions-heading" className="mt-2 font-serif text-3xl tracking-[-0.035em] sm:text-4xl">Five ways to protect your model</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted">From dusting to display and storage, here's how to care for your piece.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {careItems.map(({ icon: Icon, category, title, body, avoid }, index) => (
              <article key={title} className={`rounded-3xl border border-border bg-surface p-5 sm:p-7 ${index === careItems.length - 1 ? "sm:col-span-2" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon size={24} stroke={1.55} aria-hidden="true" />
                  </div>
                  <span aria-hidden="true" className="font-mono text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className={index === careItems.length - 1 ? "mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-end" : "mt-5"}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{body}</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3 lg:self-end">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">Avoid</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{avoid}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="materials-heading" className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] sm:mt-12">
          <article className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Important to know</p>
            <h2 id="materials-heading" className="mt-3 font-serif text-2xl tracking-[-0.03em] sm:text-3xl">A note about different materials</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              3D-printed products can use different materials, finishes, paints and construction details. If a product comes with specific care instructions, those instructions take priority over this general guide.
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              If you are unsure how to clean, store or handle a particular product, contact us before using a cleaning product or applying heat, moisture or force.
            </p>
          </article>
          <aside className="flex flex-col items-start justify-center rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <IconMessageCircle size={24} stroke={1.6} aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-serif text-2xl tracking-tight">Need a little help?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Not sure which care method is right for your Voxel3D product? Get in touch with our team.</p>
            <Link href="/contact" className={actionClass + " mt-6 bg-foreground text-background hover:bg-primary hover:text-white"}>
              Contact support <IconArrowRight size={16} stroke={1.8} aria-hidden="true" />
            </Link>
          </aside>
        </section>
        <div className="mt-8 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline">
            Continue exploring the collection <IconArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </main>
    </div>
  );
}
