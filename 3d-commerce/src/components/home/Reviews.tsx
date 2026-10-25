"use client";

import { motion } from "motion/react";
import { IconArrowUpRight, IconCheck } from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";

const HIGHLIGHTS = [
  {
    eyebrow: "Craft & finish",
    title: "Sharp detail on every 3D printed model",
    description: "Thoughtful shapes, crisp details, and a finish designed to make each model feel at home on your shelf.",
    product: "DETAIL IN FOCUS",
  },
  {
    eyebrow: "Display-ready",
    title: "Display pieces that look good from every side",
    description: "Sculptural silhouettes bring character to a desk, display cabinet, or carefully built collection.",
    product: "DESIGNED TO DISPLAY",
  },
  {
    eyebrow: "For collectors",
    title: "Collectibles with their own character",
    description: "Explore distinctive forms and expressive designs for people who like their collections to feel personal.",
    product: "COLLECT YOUR STYLE",
  },
  {
    eyebrow: "Made with care",
    title: "Easy gift ideas for anime and model fans",
    description: "Find a memorable piece for a fellow enthusiast—or choose a new favourite for your own collection.",
    product: "GIFT-WORTHY FINDS",
  },
];

export function Reviews() {
  return (
    <section className="w-full overflow-hidden py-10 sm:py-20 lg:py-24">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary sm:text-xs">
              The Voxel3D difference
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
              Details worth collecting
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-muted sm:text-base sm:text-right">
            Explore what makes a model feel at home in your collection.
          </p>
        </div>

        <div className="-mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-8 sm:gap-4 sm:px-0 desk:grid desk:grid-cols-4 desk:overflow-visible desk:pb-0">
          {HIGHLIGHTS.map((highlight, index) => (
            <motion.article
              key={highlight.eyebrow}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="group flex h-full min-h-[245px] w-[78vw] max-w-[290px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface/60 p-4 transition-all duration-500 hover:border-primary/25 hover:bg-surface sm:min-h-[300px] sm:w-[300px] sm:max-w-none sm:p-6 desk:w-auto desk:min-w-0 lg:min-h-[320px] lg:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary sm:text-xs">
                  {highlight.eyebrow}
                </span>
                <IconArrowUpRight size={18} stroke={1.4} className="shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="flex flex-1 flex-col justify-center py-5 sm:py-8">
                <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 text-primary sm:mb-5 sm:h-10 sm:w-10">
                  <IconCheck size={18} stroke={1.5} />
                </div>
                <h3 className="font-serif text-xl leading-[1.2] tracking-[-0.03em] text-foreground sm:text-2xl lg:text-[1.75rem]">
                  {highlight.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted sm:mt-3 sm:text-base sm:leading-7">
                  {highlight.description}
                </p>
              </div>
              <div className="mt-auto border-t border-border pt-4 sm:pt-5">
                <span className="inline-flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.14em] text-primary sm:text-[10px]">
                  <span className="h-px w-4 bg-primary/60" />
                  {highlight.product}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
