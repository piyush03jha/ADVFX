"use client";

import { IconBrandWhatsapp, IconMessageCircle } from "@tabler/icons-react";

const WHATSAPP_NUMBER = "919600012345";
const DEFAULT_MESSAGE =
  "Hi Forma 3D team, I need help choosing a product or placing an order.";

export function WhatsAppBot() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Forma 3D on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6"
    >
      <span className="pointer-events-none hidden rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-lg transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 sm:block sm:opacity-0">
        Chat with us
      </span>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.35)] transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-[#25D366] group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background">
        <IconBrandWhatsapp size={29} stroke={1.8} aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-semibold text-primary-foreground">
          <IconMessageCircle size={10} stroke={2} aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}
