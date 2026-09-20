"use client";

import { usePathname } from "next/navigation";
import { AuthPrompt } from "@/components/layout/AuthPrompt";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBot } from "@/components/layout/WhatsAppBot";

export function SiteChrome() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <>
      <AuthPrompt />
      <WhatsAppBot />
      <Footer />
    </>
  );
}
