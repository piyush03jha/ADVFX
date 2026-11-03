"use client";

import { useEffect, useState } from "react";

export type WhatsAppConfig = { number: string; url: string };

// NEXT_PUBLIC_* values are copied into the browser bundle when the site is BUILT.
// If the variable is only set on the host at runtime (as with Cloudflare variables),
// the bundle gets an empty string and the WhatsApp links looked "not configured".
// So this is only the first guess; the real value is fetched from the server below.
const BUILD_TIME: WhatsAppConfig = {
  number: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  url: process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim() ?? "",
};

const hasConfig = (config: WhatsAppConfig) => Boolean(config.number || config.url);

let cached: WhatsAppConfig | null = hasConfig(BUILD_TIME) ? BUILD_TIME : null;
let inflight: Promise<WhatsAppConfig> | null = null;

function fetchRuntimeConfig(): Promise<WhatsAppConfig> {
  inflight ??= fetch("/api/public-config/whatsapp")
    .then((response) => (response.ok ? response.json() : { number: "", url: "" }))
    .then((data: Partial<WhatsAppConfig>) => {
      const config = {
        number: String(data.number ?? "").replace(/\D/g, ""),
        url: String(data.url ?? "").trim(),
      };
      if (hasConfig(config)) cached = config;
      return config;
    })
    .catch(() => ({ number: "", url: "" }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** WhatsApp settings: the build-time value when present, otherwise the runtime one. */
export function useWhatsAppConfig(): WhatsAppConfig {
  const [config, setConfig] = useState<WhatsAppConfig>(cached ?? { number: "", url: "" });

  useEffect(() => {
    if (cached) return;
    let active = true;
    void fetchRuntimeConfig().then((next) => {
      if (active && hasConfig(next)) setConfig(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return config;
}

export function buildWhatsAppUrl(config: WhatsAppConfig, message: string): string | null {
  if (config.number) {
    return `https://wa.me/${config.number}?text=${encodeURIComponent(message)}`;
  }

  if (config.url) {
    try {
      const url = new URL(config.url);
      if (
        url.protocol === "https:" &&
        (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com" || url.hostname.endsWith(".whatsapp.com"))
      ) {
        url.searchParams.set("text", message);
        return url.toString();
      }
    } catch {
      // Treat invalid configuration as unavailable instead of opening a broken URL.
    }
  }

  return null;
}
