"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight, IconCamera, IconBox, IconSparkles } from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const steps = [
  { number: "01", icon: IconCamera, title: "Share", text: "Send a photo, sketch, or simply tell us what you have in mind." },
  { number: "02", icon: IconSparkles, title: "We create", text: "Our team turns your reference into a production-ready design." },
  { number: "03", icon: IconBox, title: "Made for you", text: "We produce the physical piece and arrange delivery." },
];

export function CustomBuild() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      <Container>
        <div className="grid overflow-hidden rounded-[1.5rem] border border-border bg-surface lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65 }}
            className="flex flex-col justify-center px-5 py-7 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
          >
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-primary sm:text-[10px]">
              Custom made
            </p>

            <h2 className="mt-3 max-w-xl font-serif text-[2rem] leading-[0.95] tracking-[-0.05em] text-foreground sm:mt-4 sm:text-5xl lg:text-[4.25rem]">
              Your idea,
              <span className="block text-muted">made tangible.</span>
            </h2>

            <p className="mt-4 max-w-lg text-xs leading-5 text-muted sm:mt-6 sm:text-base sm:leading-7">
              Have something personal in mind? Send us your reference and requirements. We handle the design, production, and physical delivery.
            </p>

            <div className="mt-6 sm:mt-8">
              <Button href="/custom" size="lg" className="group">
                Start a custom request
                <IconArrowUpRight
                  size={17}
                  stroke={1.8}
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Button>
            </div>

            <div className="mt-7 hidden border-t border-border pt-6 sm:mt-12 sm:block sm:pt-8">
              <p className="mb-5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
                From reference to finished piece
              </p>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.number}
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.07 }}
                    >
                      <div className="flex items-center gap-2 text-muted">
                        <span className="font-mono text-[9px] tracking-[0.16em]">{step.number}</span>
                        <Icon size={15} stroke={1.5} className="text-primary" />
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-muted">{step.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8 }}
            className="relative flex min-h-[205px] items-center justify-center overflow-hidden bg-surface sm:min-h-[420px] lg:min-h-full"
          >
            <img
              src="/catogeries/couple.png"
              alt="Custom 3D printed collectible"
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain object-center"
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
