"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  IconMinus,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";

import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { faqItems } from "@/config/faq";

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(
    faqItems[0]?.id ?? null,
  );

  const [showAllMobile, setShowAllMobile] =
    useState(false);

  const shouldReduceMotion =
    useReducedMotion();

  const toggleQuestion = (id: string) => {
    setOpenId((current) =>
      current === id ? null : id,
    );
  };

  const mobileQuestions = showAllMobile
    ? faqItems
    : faqItems.slice(0, 3);

  return (
    <Section
      id="faq"
      glow
      className="
        overflow-hidden
        py-14
        sm:py-20
        lg:py-32
      "
    >
      {/* =================================================
          AMBIENT GLOW
      ================================================= */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-[-10%]
          top-[18%]
          -z-10
          h-[300px]
          w-[300px]
          rounded-full
          bg-primary/[0.035]
          blur-[100px]
          sm:right-[4%]
          sm:h-[360px]
          sm:w-[360px]
          sm:blur-[120px]
        "
      />

      <div
        className="
          grid
          gap-8
          lg:grid-cols-[0.72fr_1.28fr]
          lg:gap-20
        "
      >
        {/* =================================================
            LEFT / INTRO
        ================================================= */}

        <motion.div
          initial={
            shouldReduceMotion
              ? false
              : {
                  opacity: 0,
                  x: -24,
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
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            lg:sticky
            lg:top-28
            lg:self-start
          "
        >
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
            FAQ
          </p>

          <h2
            className="
              mt-3
              text-3xl
              font-semibold
              leading-[0.95]
              tracking-[-0.045em]
              text-foreground
              sm:mt-4
              sm:text-5xl
              lg:text-6xl
            "
          >
            Common
            <br />
            <span className="text-muted">
              Questions
            </span>
          </h2>

          <p
            className="
              mt-4
              max-w-sm
              text-xs
              leading-5
              text-muted
              sm:mt-5
              sm:text-sm
              sm:leading-6
            "
          >
            Everything you need to know
            before your first order.
          </p>

          <div
            aria-hidden="true"
            className="
              mt-7
              hidden
              h-px
              w-16
              bg-gradient-to-r
              from-primary
              to-transparent
              lg:block
            "
          />
        </motion.div>

        {/* =================================================
            FAQ CONTENT
        ================================================= */}

        <div
          className="
            border-t
            border-border/80
          "
        >
          {/* =================================================
              DESKTOP
          ================================================= */}

          <div className="hidden sm:block">
            {faqItems.map((item, index) => {
              const isOpen =
                openId === item.id;

              return (
                <FAQItem
                  key={item.id}
                  item={item}
                  index={index}
                  isOpen={isOpen}
                  onToggle={toggleQuestion}
                  shouldReduceMotion={
                    shouldReduceMotion
                  }
                />
              );
            })}
          </div>

          {/* =================================================
              MOBILE
          ================================================= */}

          <div className="sm:hidden">
            <AnimatePresence initial={false}>
              {mobileQuestions.map(
                (item, index) => {
                  const isOpen =
                    openId === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      initial={
                        showAllMobile &&
                        index >= 3
                          ? {
                              opacity: 0,
                              height: 0,
                            }
                          : false
                      }
                      animate={{
                        opacity: 1,
                        height: "auto",
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      transition={{
                        duration: 0.3,
                      }}
                    >
                      <FAQItem
                        item={item}
                        index={index}
                        isOpen={isOpen}
                        onToggle={
                          toggleQuestion
                        }
                        shouldReduceMotion={
                          shouldReduceMotion
                        }
                      />
                    </motion.div>
                  );
                },
              )}
            </AnimatePresence>

            {/* =================================================
                VIEW ALL
            ================================================= */}

            {faqItems.length > 3 && (
              <div className="flex justify-center pt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShowAllMobile(
                      (current) => !current,
                    )
                  }
                  className="
                    !min-h-10
                    px-5
                  "
                >
                  {showAllMobile
                    ? "Show less"
                    : "View all questions"}

                  <IconChevronDown
                    size={14}
                    stroke={1.7}
                    className={`
                      transition-transform
                      duration-300
                      ${
                        showAllMobile
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* =========================================================
   FAQ ITEM
========================================================= */

function FAQItem({
  item,
  index,
  isOpen,
  onToggle,
  shouldReduceMotion,
}: {
  item: (typeof faqItems)[number];
  index: number;
  isOpen: boolean;
  onToggle: (id: string) => void;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={
        shouldReduceMotion
          ? false
          : {
              opacity: 0,
              y: 12,
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
        amount: 0.1,
      }}
      transition={{
        duration: 0.5,
        delay: shouldReduceMotion
          ? 0
          : index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        border-b
        border-border/80
        transition-colors
        duration-300
        ${
          isOpen
            ? "border-primary/20"
            : ""
        }
      `}
    >
      {/* QUESTION */}

      <div
        className="
          flex
          min-h-[68px]
          items-center
          gap-3
          sm:min-h-[76px]
          sm:gap-5
        "
      >
        <button
          type="button"
          onClick={() =>
            onToggle(item.id)
          }
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${item.id}`}
          className="
            group
            flex
            min-w-0
            flex-1
            items-center
            justify-between
            gap-4
            py-4
            text-left
            sm:gap-5
            sm:py-5
          "
        >
          <span
            className={`
              text-xs
              font-medium
              leading-5
              transition-colors
              duration-300
              sm:text-base
              sm:leading-6
              ${
                isOpen
                  ? "text-foreground"
                  : "text-muted"
              }
              group-hover:text-foreground
            `}
          >
            {item.question}
          </span>
        </button>

        {/* PLUS / MINUS */}

        <IconButton
          label={
            isOpen
              ? `Collapse ${item.question}`
              : `Expand ${item.question}`
          }
          size="sm"
          variant={
            isOpen
              ? "primary"
              : "default"
          }
          onClick={() =>
            onToggle(item.id)
          }
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${item.id}`}
          className="
            mr-1
            sm:mr-0
          "
        >
          {isOpen ? (
            <IconMinus
              size={14}
              stroke={1.7}
              aria-hidden="true"
            />
          ) : (
            <IconPlus
              size={14}
              stroke={1.7}
              aria-hidden="true"
            />
          )}
        </IconButton>
      </div>

      {/* ANSWER */}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${item.id}`}
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              height: {
                duration: 0.35,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              },
              opacity: {
                duration: 0.2,
              },
            }}
            className="overflow-hidden"
          >
            <div
              className="
                max-w-2xl
                pb-6
                pr-10
                text-xs
                leading-6
                text-muted
                sm:pb-7
                sm:pr-16
                sm:text-sm
                sm:leading-7
              "
            >
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}