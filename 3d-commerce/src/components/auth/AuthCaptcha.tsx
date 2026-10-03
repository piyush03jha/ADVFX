"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        action?: string;
        theme?: "auto" | "light" | "dark";
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "timeout-callback"?: () => void;
        "error-callback"?: (errorCode?: string) => void | boolean;
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

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

function loadTurnstile(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
  });
}

function describeError(code?: string) {
  if (code?.startsWith("110200")) return "This domain is not allowed for the Turnstile widget. Add it in the Cloudflare Turnstile dashboard.";
  if (code?.startsWith("1101") || code?.startsWith("400020")) return "The Turnstile site key is invalid.";
  return `Security check failed${code ? ` (code ${code})` : ""}. Please reload and try again.`;
}

export function AuthCaptcha({ purpose, onTokenChange, siteKey }: AuthCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [message, setMessage] = useState("");

  useEffect(() => { onTokenChangeRef.current = onTokenChange; }, [onTokenChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return;
    let cancelled = false;
    let widgetId: string | undefined;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        container.innerHTML = "";
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          action: purpose,
          theme: "auto",
          callback: (token) => { setMessage(""); onTokenChangeRef.current(token); },
          "expired-callback": () => onTokenChangeRef.current(""),
          "timeout-callback": () => onTokenChangeRef.current(""),
          "error-callback": (code) => {
            onTokenChangeRef.current("");
            setMessage(describeError(code));
            return true;
          },
        });
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not load the security check. Disable ad blockers and reload.");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile?.remove) window.turnstile.remove(widgetId);
    };
  }, [purpose, siteKey]);

  if (!siteKey) return <div className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-3 text-xs leading-5 text-red-200">Turnstile site key is not configured.</div>;
  return <div><div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" /></div>;
}