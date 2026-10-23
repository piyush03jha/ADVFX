"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBot } from "@/components/layout/WhatsAppBot";
import dynamic from "next/dynamic";

// Keep Three.js in a separate chunk. SiteChrome only mounts the intro on the
// homepage for first-time visitors, so returning visitors do not load this chunk.
const LogoIntro = dynamic(() =>
  import("@/components/intro/LogoIntro").then((m) => m.LogoIntro),
);

const PLAYED_KEY = "voxel-intro-played";

function hasPlayedIntro() {
  for (const getStore of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      if (getStore().getItem(PLAYED_KEY) === "1") return true;
    } catch {
      // Storage can be blocked; LogoIntro handles the same case safely.
    }
  }
  return false;
}

export function SiteChrome() {
  const pathname = usePathname();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setShowIntro(false);
      return;
    }

    const forceReplay = new URLSearchParams(window.location.search).get("intro") === "1";
    setShowIntro(forceReplay || !hasPlayedIntro());
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
