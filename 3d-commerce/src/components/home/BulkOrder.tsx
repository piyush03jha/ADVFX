"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight, IconBuildingStore, IconPackage, IconUsers } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const points = [
  { icon: IconPackage, title: "Volume pricing", text: "Tell us your quantity and requirements." },
  { icon: IconBuildingStore, title: "Production support", text: "We coordinate the physical manufacturing workflow." },
  { icon: IconUsers, title: "Business orders", text: "Ideal for teams, events, gifting and retail." },
];

export function BulkOrder() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="bulk-order" className="relative scroll-mt-28 overflow-hidden border-y border-border/70 py-14 sm:py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_35%,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(59,130,246,0.07),transparent_30%)]" />
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65 }}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-primary sm:text-[10px]">Bulk orders</p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-[0.96] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-6xl">
              Need a collection, not just one piece?
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
              Share the quantity, product requirements and delivery timeline. Our team will help plan the order from pricing through production.
            </p>
            <div className="mt-7">
              <Button href="/contact" size="lg">
                Discuss a bulk order
                <IconArrowUpRight size={17} stroke={1.8} />
              </Button>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {points.map((point, index) => {
              const Icon = point.icon;
              return (
                <motion.div key={point.title} initial={reduceMotion ? false : { opacity: 0, x: 20 }} whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.07 }} className="rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
                  <Icon size={21} stroke={1.5} className="text-primary" />
                  <h3 className="mt-4 text-sm font-semibold text-foreground sm:text-base">{point.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted sm:text-sm">{point.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
