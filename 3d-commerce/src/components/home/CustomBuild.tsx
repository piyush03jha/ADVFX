"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight, IconBox, IconCamera, IconCheck, IconSparkles } from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const steps = [
  { icon: IconCamera, title: "Share your idea", description: "Photos, sketches or references" },
  { icon: IconSparkles, title: "We craft it", description: "Created by our 3D team" },
  { icon: IconBox, title: "Made real", description: "A physical piece, made for you" },
];

const benefits = ["Personalized dimensions", "Production-ready 3D modeling", "Guidance from concept to delivery"];

export function CustomBuild() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-12 sm:py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_40%,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_85%_55%,rgba(59,130,246,0.10),transparent_30%)]" />

      <Container>
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface-elevated shadow-[0_24px_90px_rgba(0,0,0,0.12)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(139,92,246,0.07)_48%,transparent_100%)]" />

          <div className="relative grid lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 xl:px-16"
            >
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary sm:text-xs">
                <span className="h-px w-8 bg-primary" />
                Your idea. Our craft.
              </div>

              <h2 className="mt-5 max-w-xl text-[2.8rem] font-semibold leading-[0.94] tracking-[-0.065em] text-foreground sm:text-5xl lg:text-[4.25rem]">
                Turn someone special
                <span className="mt-2 block text-muted">into a bobblehead.</span>
              </h2>

              <p className="mt-6 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
                Start with JPG/PNG reference photos and your requirements. We’ll review the request, create the physical piece, and guide you through the final order and delivery.
              </p>

              <div className="mt-7 space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <IconCheck size={12} stroke={2.5} />
                    </span>
                    {benefit}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex">
                <Button href="/custom" variant="primary" size="lg" className="w-full min-[420px]:w-auto">
                  Start your custom order
                  <IconArrowUpRight size={17} stroke={1.8} />
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-3 border-t border-border/70 pt-6 sm:mt-12 sm:gap-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08 }}
                      className="min-w-0"
                    >
                      <Icon size={19} stroke={1.5} className="text-primary" />
                      <p className="mt-2 text-[11px] font-semibold text-foreground sm:text-xs">{step.title}</p>
                      <p className="mt-1 hidden text-[11px] leading-4 text-muted sm:block">{step.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 28 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[360px] overflow-hidden sm:min-h-[500px] lg:min-h-[650px]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.22),transparent_48%)]" />
              <div className="absolute left-[8%] top-[9%] w-[48%] aspect-square overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:left-[12%] sm:top-[12%] sm:w-[43%]">
                <img src="/catogeries/couple.webp" alt="Bobblehead reference photo placeholder" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10" />
                <span className="absolute bottom-4 left-4 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">Your reference</span>
              </div>
              <div className="absolute bottom-[8%] right-[5%] w-[52%] aspect-[860/1147] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:bottom-[12%] sm:right-[9%] sm:w-[45%]">
                <img src="/catogeries/bobble_head.webp" alt="Finished custom bobblehead placeholder" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10" />
                <span className="absolute bottom-4 left-4 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">Your bobblehead</span>
              </div>
              <div className="absolute bottom-6 left-6 rounded-xl border border-white/15 bg-black/65 px-4 py-3 text-white backdrop-blur-md sm:bottom-10 sm:left-10">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/60">Made personal</p>
                <p className="mt-1 text-sm font-medium">A collectible with character</p>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
