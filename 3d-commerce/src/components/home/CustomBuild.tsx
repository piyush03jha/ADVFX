"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  IconArrowUpRight,
  IconBox,
  IconCamera,
  IconSparkles,
} from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const steps = [
  {
    icon: IconCamera,
    title: "Upload Photos",
    description: "Share clear reference photos",
  },
  {
    icon: IconSparkles,
    title: "We Build",
    description: "We create your 3D model",
  },
  {
    icon: IconBox,
    title: "You Receive",
    description: "Get your finished model",
  },
];

export function CustomBuild() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="
        relative
        overflow-hidden
        py-10
        sm:py-16
        lg:py-28
      "
    >
      {/* =================================================
          BACKGROUND
      ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          -z-10
          bg-[radial-gradient(circle_at_75%_45%,rgba(139,92,246,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.018),transparent_45%)]
        "
      />

      <Container>
        <div
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-border/70
            bg-surface

            sm:rounded-3xl
          "
        >
          {/* =================================================
              INNER PURPLE GLOW
          ================================================== */}

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              right-[-120px]
              top-[-100px]
              -z-0
              h-[360px]
              w-[360px]
              rounded-full
              bg-primary/10
              blur-[110px]

              sm:right-[-80px]
              sm:top-[-80px]
              sm:h-[500px]
              sm:w-[500px]
              sm:blur-[120px]
            "
          />

          <div
            className="
              relative
              grid
              lg:grid-cols-[0.9fr_1.1fr]
            "
          >
            {/* =================================================
                CONTENT
            ================================================== */}

            <motion.div
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: -30,
                    }
              }
              whileInView={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: 1,
                      x: 0,
                    }
              }
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                relative
                z-10
                flex
                flex-col
                justify-center

                px-5
                py-9

                sm:px-10
                sm:py-14

                lg:px-12
                lg:py-16

                xl:px-16
              "
            >
              {/* Eyebrow */}

              <p
                className="
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.24em]
                  text-primary

                  sm:text-[10px]
                "
              >
                Custom 3D
              </p>

              {/* Heading */}

              <h2
                className="
                  mt-4
                  max-w-xl
                  text-[2.25rem]
                  font-semibold
                  leading-[0.96]
                  tracking-[-0.05em]
                  text-foreground

                  sm:mt-5
                  sm:text-5xl

                  lg:text-[3.6rem]
                "
              >
                Build something
                <br />

                <span className="text-muted">
                  uniquely yours.
                </span>
              </h2>

              {/* Description */}

              <p
                className="
                  mt-5
                  max-w-lg
                  text-[13px]
                  leading-6
                  text-muted

                  sm:mt-6
                  sm:text-base
                  sm:leading-7
                "
              >
                Have something that doesn't exist
                in our library? Send us photos,
                dimensions, and requirements.
                We'll turn your idea into a
                production-ready 3D model.
              </p>

              {/* =================================================
                  BUTTONS
              ================================================== */}

              <div
                className="
                  mt-7
                  flex
                  flex-col
                  gap-3

                  min-[400px]:flex-row

                  sm:mt-8
                "
              >
                <Button
                  href="/custom"
                  variant="primary"
                  size="md"
                  className="
                    w-full
                    min-[400px]:w-auto
                  "
                >
                  Start a Custom Order

                  <IconArrowUpRight
                    size={16}
                    stroke={1.8}
                  />
                </Button>

                <Button
                  href="/custom/examples"
                  variant="outline"
                  size="md"
                  className="
                    w-full
                    min-[400px]:w-auto
                  "
                >
                  See Examples
                </Button>
              </div>

              {/* =================================================
                  PROCESS STEPS
              ================================================== */}

              <div
                className="
                  mt-8
                  grid
                  grid-cols-3
                  gap-2

                  sm:mt-10
                  sm:gap-5

                  lg:mt-12
                "
              >
                {steps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <motion.div
                      key={step.title}
                      initial={
                        shouldReduceMotion
                          ? false
                          : {
                              opacity: 0,
                              y: 15,
                            }
                      }
                      whileInView={
                        shouldReduceMotion
                          ? undefined
                          : {
                              opacity: 1,
                              y: 0,
                            }
                      }
                      viewport={{
                        once: true,
                        amount: 0.2,
                      }}
                      transition={{
                        duration: 0.5,
                        delay: shouldReduceMotion
                          ? 0
                          : 0.15 + index * 0.08,
                      }}
                      className="
                        min-w-0
                      "
                    >
                      {/* Icon */}

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-border
                          bg-background/60
                          text-primary

                          sm:h-9
                          sm:w-9
                        "
                      >
                        <Icon
                          size={14}
                          stroke={1.6}
                        />
                      </div>

                      {/* Text */}

                      <p
                        className="
                          mt-2
                          truncate
                          text-[10px]
                          font-medium
                          text-foreground

                          sm:text-xs
                        "
                      >
                        {step.title}
                      </p>

                      <p
                        className="
                          mt-0.5
                          hidden
                          text-[10px]
                          leading-4
                          text-muted

                          sm:block
                        "
                      >
                        {step.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* =================================================
                VISUAL AREA
            ================================================== */}

            <motion.div
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: 30,
                    }
              }
              whileInView={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: 1,
                      x: 0,
                    }
              }
              viewport={{
                once: true,
                amount: 0.15,
              }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                relative
                h-[300px]
                overflow-hidden

                sm:h-[420px]

                lg:min-h-[560px]
                lg:h-auto
              "
            >
              {/* =================================================
                  IMAGE 1
              ================================================== */}

              <div
                className="
                  absolute
                  left-[5%]
                  top-[10%]
                  h-[70%]
                  w-[50%]
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/10
                  bg-surface-elevated
                  shadow-2xl

                  sm:left-[10%]
                  sm:top-[12%]
                  sm:h-[58%]
                  sm:w-[40%]
                "
              >
                <img
                  src="/catogeries/1.jpg"
                  alt="Custom 3D model example"
                  loading="lazy"
                  className="
                    h-full
                    w-full
                    object-cover
                    transition-transform
                    duration-700
                    hover:scale-105
                  "
                />

                <div
                  aria-hidden="true"
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/45
                    via-transparent
                    to-white/5
                  "
                />
              </div>

              {/* =================================================
                  IMAGE 2
              ================================================== */}

              <div
                className="
                  absolute
                  right-[4%]
                  top-[20%]
                  h-[70%]
                  w-[52%]
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/10
                  bg-surface-elevated
                  shadow-2xl

                  sm:right-[8%]
                  sm:top-[25%]
                  sm:h-[58%]
                  sm:w-[42%]
                "
              >
                <img
                  src="/catogeries/2.jpg"
                  alt="Custom 3D model example"
                  loading="lazy"
                  className="
                    h-full
                    w-full
                    object-cover
                    transition-transform
                    duration-700
                    hover:scale-105
                  "
                />

                <div
                  aria-hidden="true"
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/45
                    via-transparent
                    to-white/5
                  "
                />
              </div>

              {/* =================================================
                  PURPLE GLOW
              ================================================== */}

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  bottom-[5%]
                  left-[30%]
                  h-28
                  w-28
                  rounded-full
                  bg-primary/20
                  blur-[70px]

                  sm:bottom-[8%]
                  sm:h-32
                  sm:w-32
                  sm:blur-[80px]
                "
              />
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}