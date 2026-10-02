"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBot } from "@/components/layout/WhatsAppBot";
import { LogoIntro } from "@/components/intro/LogoIntro";

export function SiteChrome() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <>
      <LogoIntro />
      <WhatsAppBot />
      <Footer />
    </>
  );
}
