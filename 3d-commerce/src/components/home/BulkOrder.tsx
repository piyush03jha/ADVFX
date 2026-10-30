"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight, IconBuildingStore, IconPackage, IconUsers } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { BUSINESS_FACTS } from "@/lib/aeo-content.mjs";

const points = [
  { icon: IconPackage, title: "Volume pricing", text: "Tell us your quantity and requirements." },
  { icon: IconBuildingStore, title: "Production support", text: "We coordinate the physical manufacturing workflow." },
  { icon: IconUsers, title: "Business orders", text: "Ideal for teams, events, gifting and retail." },
];

export function BulkOrder() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="bulk-order" className="relative scroll-mt-28 overflow-hidden border-y border-border/70 py-10 sm:py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_35%,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(59,130,246,0.07),transparent_30%)]" />
      <Container>
        <div className="grid gap-7 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 wide:gap-20">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65 }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary sm:text-xs">Bulk orders</p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-4xl wide:text-6xl">
              Need a collection, not just one piece?
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Share the quantity, product requirements and delivery timeline. Our team will help plan the order from pricing through production, and is available {BUSINESS_FACTS.supportHours}.
            </p>
            <div className="mt-7">
              <Button href="/contact" size="lg">
                Discuss a bulk order
                <IconArrowUpRight size={18} stroke={1.8} />
              </Button>
            </div>
          </motion.div>

          {/* A real list (same grid, same cards) so the three benefits are exposed as list items. */}
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:gap-3 lg:grid-cols-1 lg:gap-3">
            {points.map((point, index) => {
              const Icon = point.icon;
              return (
                <motion.li key={point.title} initial={reduceMotion ? false : { opacity: 0, x: 20 }} whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.07 }} className="rounded-xl border border-border bg-surface/60 p-3 sm:rounded-2xl sm:p-6 lg:p-7">
                  <Icon size={20} stroke={1.5} className="text-primary sm:size-6" />
                  <h3 className="mt-2 text-xs font-semibold leading-snug text-foreground sm:mt-4 sm:text-lg">{point.title}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-muted sm:text-base sm:leading-7">{point.text}</p>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
