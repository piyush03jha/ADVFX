"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import { newArrivals } from "@/config/new-arrivals";
import { ProductCard } from "./MostPurchased";

export function NewArrivals() {
  const shouldReduceMotion = useReducedMotion();
  const animationInitial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const animationWhileInView = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <Section glow className="py-12 sm:py-20 lg:py-28">
      <Container>
        <motion.div initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mb-6 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.24em] text-primary sm:mb-2 sm:text-[10px]">Fresh In</p>
            <h2 className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">New Arrivals</h2>
          </div>

          <Button href="/shop?sort=newest" variant="ghost" size="sm" className="group hidden sm:inline-flex">
            Explore All Models
            <IconArrowUpRight size={16} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {newArrivals.slice(0, 4).map((product, index) => (
            <motion.div key={product.id} initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.55, delay: shouldReduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }} className="min-w-0">
              <ProductCard product={{ ...product, rating: product.rating ?? 0, reviewCount: product.reviewCount ?? 0 }} />
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex justify-center sm:hidden">
          <Button href="/shop?sort=newest" variant="outline" size="sm" className="group">
            Explore All Models
            <IconArrowUpRight size={15} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
