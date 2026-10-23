"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [showIntro, setShowIntro] = useState(false);

  // Keep the WebGL intro available for visual reviews, but never put a full-screen
  // animation in front of the first page render. The overlay delayed LCP for
  // first-time visitors and loaded Three.js on every homepage visit.
  useEffect(() => {
    setShowIntro(
      pathname === "/" &&
      new URLSearchParams(window.location.search).get("intro") === "1",
    );
  }, [pathname]);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <>
      {showIntro && <LogoIntro />}
      <WhatsAppBot />
      <Footer />
    </>
  );
}
