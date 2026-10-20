"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBot } from "@/components/layout/WhatsAppBot";
import dynamic from "next/dynamic";

// The intro pulls in three.js, so keep it out of the shared bundle: it is only
// downloaded on the homepage, where it actually plays.
const LogoIntro = dynamic(() =>
  import("@/components/intro/LogoIntro").then((m) => m.LogoIntro),
);

export function SiteChrome() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <>
      {pathname === "/" && <LogoIntro />}
      <WhatsAppBot />
      <Footer />
    </>
  );
}
