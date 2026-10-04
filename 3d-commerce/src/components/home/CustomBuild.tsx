"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export function CustomBuild() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-10 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1664px] px-0 sm:px-5 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
          className="relative aspect-[16/9] w-full overflow-hidden sm:rounded-[1.5rem]"
        >
          <Image
            src="/custom-3d-creation-studio.webp"
            alt="Create a custom 3D model from your photos"
            fill
            sizes="(max-width: 1664px) 100vw, 1664px"
            quality={100}
            className="object-cover"
            priority={false}
          />

          <Link
            href="/custom"
            aria-label="Create your custom 3D model"
            className="absolute left-[4.7%] top-[72.8%] h-[8.2%] w-[26%] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="sr-only">Create Your Custom 3D Model</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
