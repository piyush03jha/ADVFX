"use client";

import { useState } from "react";
import { IconBrandWhatsapp, IconMessageCircle, IconX } from "@tabler/icons-react";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const PREDEFINED_QUESTIONS = [
  {
    label: "Help me choose a product",
    message: "Hi Forma 3D team, please help me choose a product.",
  },
  {
    label: "Track my order",
    message: "Hi Forma 3D team, I want to check my order status.",
  },
  {
    label: "Ask about a custom 3D model",
    message: "Hi Forma 3D team, I want to discuss a custom 3D model.",
  },
  {
    label: "Get pricing information",
    message: "Hi Forma 3D team, I would like pricing information.",
  },
  {
    label: "Shipping and delivery",
    message: "Hi Forma 3D team, I have a question about shipping and delivery.",
  },
  {
    label: "Returns or refunds",
    message: "Hi Forma 3D team, I need help with a return or refund.",
  },
  {
    label: "Talk to support",
    message: "Hi Forma 3D team, I need to speak with support.",
  },
] as const;

function createWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppBot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <section
          id="whatsapp-question-panel"
          role="dialog"
          aria-label="WhatsApp support questions"
          className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl sm:bottom-28 sm:right-6"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold">How can we help?</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a question to continue on WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp questions"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            {PREDEFINED_QUESTIONS.map((question) => (
              <a
                key={question.label}
                href={createWhatsAppUrl(question.message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                {question.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="whatsapp-question-panel"
        aria-label={isOpen ? "Close WhatsApp support questions" : "Open WhatsApp support questions"}
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6"
      >
        <span className="pointer-events-none hidden rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-lg transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 sm:block sm:opacity-0">
          {isOpen ? "Close" : "Chat with us"}
        </span>
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.35)] transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-[#25D366] group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background">
          {isOpen ? (
            <IconX size={27} stroke={1.8} aria-hidden="true" />
          ) : (
            <IconBrandWhatsapp size={29} stroke={1.8} aria-hidden="true" />
          )}
          {!isOpen && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-semibold text-primary-foreground">
              <IconMessageCircle size={10} stroke={2} aria-hidden="true" />
            </span>
          )}
        </span>
      </button>
    </>
  );
}
