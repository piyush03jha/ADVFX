"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
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
    <section className="relative overflow-hidden py-10 sm:py-24 lg:py-32">
      <Container>
        <div className="group/custom relative isolate rounded-[1.5rem]">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-1.5 rounded-[1.8rem] bg-primary/30 opacity-75 blur-xl transition-opacity duration-500 group-hover/custom:opacity-100 sm:-inset-2.5 sm:blur-2xl" />
          <div className="relative grid overflow-hidden rounded-[1.5rem] border border-primary/35 bg-surface shadow-[0_0_0_1px_rgba(139,92,246,0.08)] transition-colors duration-500 hover:border-primary/50 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65 }}
              className="flex flex-col justify-center px-5 py-7 sm:px-10 sm:py-14 lg:px-8 lg:py-12 wide:px-14 wide:py-16"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-primary sm:text-xs">
                Custom made
              </p>
              <h2 className="mt-3 max-w-xl font-serif text-[2rem] leading-[0.98] tracking-[-0.05em] text-foreground sm:mt-4 sm:text-5xl lg:text-[2.75rem] wide:text-[4.25rem]">
                Your idea,
                <span className="block text-muted">made tangible.</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted sm:mt-6 sm:text-lg sm:leading-8">
                Have something personal in mind? Send us your reference and requirements. We handle the design, production, and physical delivery.
              </p>
              <div className="mt-6 sm:mt-8">
                <Button href="/custom" size="lg" className="group">
                  Start a custom request
                  <IconArrowUpRight size={17} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </div>
              <div className="mt-7 hidden border-t border-border pt-6 sm:mt-12 sm:block sm:pt-8">
                <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted sm:text-xs">
                  From reference to finished piece
                </p>
                <ol className="grid grid-cols-3 gap-2.5 sm:gap-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.li
                        key={step.number}
                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.07 }}
                      >
                        <div className="flex items-center gap-2 text-muted">
                          <span aria-hidden="true" className="font-mono text-[10px] tracking-[0.16em]">{step.number}</span>
                          <Icon size={17} stroke={1.5} className="text-primary" />
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-6 text-muted">{step.text}</p>
                      </motion.li>
                    );
                  })}
                </ol>
              </div>
            </motion.div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8 }}
              className="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-surface sm:min-h-[420px] lg:min-h-full"
            >
              <Image src="/catogeries/couple1.png" alt="Custom 3D printed collectible made to order by Voxel3D" fill sizes="(max-width: 1023px) 100vw, 45vw" className="object-contain object-center" />
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
