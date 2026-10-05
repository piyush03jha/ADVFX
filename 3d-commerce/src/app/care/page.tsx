import type { Metadata } from "next";
import Link from "next/link";
import {
  IconBox,
  IconDroplet,
  IconSun,
  IconTemperature,
  IconSparkles,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Care Guide — Voxel3D",
  description: "Simple care and handling guidance for Voxel3D physical 3D-printed products and collectibles.",
};

const careItems = [
  {
    icon: IconSparkles,
    title: "Clean gently",
    body: "Use a soft, clean cloth to remove dust. If needed, lightly dampen the cloth with water and wipe gently. Avoid abrasive pads, aggressive scrubbing, and harsh cleaning chemicals.",
  },
  {
    icon: IconTemperature,
    title: "Avoid excessive heat",
    body: "Keep your model away from high-heat sources such as heaters, hot surfaces, and enclosed spaces that become extremely hot. Heat can affect some 3D-printed materials.",
  },
  {
    icon: IconSun,
    title: "Limit prolonged direct sunlight",
    body: "For the best long-term appearance, avoid leaving the product in strong direct sunlight for extended periods. Light and heat can affect some finishes and materials over time.",
  },
  {
    icon: IconDroplet,
    title: "Keep it dry",
    body: "Avoid prolonged exposure to water or moisture unless the product information specifically says otherwise. Do not soak or submerge the model.",
  },
  {
    icon: IconBox,
    title: "Handle and store carefully",
    body: "Support the model by its stronger main body rather than thin or delicate details. When storing or moving it, use suitable protective packaging and avoid placing heavy objects on top.",
  },
];

export default function CareGuidePage() {
  return (
    <main className="min-h-[70vh] bg-background">
      <section className="mx-auto max-w-[1100px] px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            Product care
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
            Care for your Voxel3D
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            A few simple habits will help keep your physical model clean,
            protected, and looking its best.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {careItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="bg-surface p-6 sm:p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-primary">
                  <Icon size={19} stroke={1.5} aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-base font-medium text-foreground">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold tracking-[-0.03em] text-foreground">
            A note about different materials
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            3D-printed products can use different materials, finishes, paints,
            and construction details. If a product comes with specific care
            instructions, those instructions take priority over this general
            guide.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            If you are unsure how to clean, store, or handle a particular
            product, contact us before using a cleaning product or applying
            heat, moisture, or force.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex text-xs font-medium uppercase tracking-[0.14em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
