"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        action?: string;
        theme?: "auto" | "light" | "dark";
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

type AuthCaptchaProps = {
  purpose: "login" | "register" | "forgot-password";
  onTokenChange: (token: string) => void;
  siteKey?: string;
};

export function AuthCaptcha({ purpose, onTokenChange, siteKey }: AuthCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      containerRef.current.innerHTML = "";
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: purpose,
        theme: "auto",
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    };

    if (window.turnstile) {
      render();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.remove) window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existing) {
      existing.addEventListener("load", render);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (existing) existing.removeEventListener("load", render);
      if (widgetIdRef.current && window.turnstile?.remove) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
  }, [onTokenChange, purpose, siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-3 text-xs leading-5 text-red-200">
        Turnstile site key is not configured.
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" />;
}
