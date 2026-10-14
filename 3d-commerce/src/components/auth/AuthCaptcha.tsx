"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        theme?: "light" | "dark";
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => number;
    };
    __onRecaptchaLoad?: () => void;
  }
}

type AuthCaptchaProps = {
  purpose: "login" | "register" | "forgot-password";
  onTokenChange: (token: string) => void;
  siteKey?: string;
};

const RECAPTCHA_SRC = "https://www.google.com/recaptcha/api.js?render=explicit&onload=__onRecaptchaLoad";
const RECAPTCHA_SCRIPT_ID = "google-recaptcha-script";

function loadRecaptcha(): Promise<void> {
  if (window.grecaptcha?.render) return Promise.resolve();

  return new Promise((resolve, reject) => {
    window.__onRecaptchaLoad = () => resolve();

    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("reCAPTCHA script failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = RECAPTCHA_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("reCAPTCHA script failed to load"));
    document.head.appendChild(script);
  });
}

export function AuthCaptcha({ onTokenChange, siteKey }: AuthCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [message, setMessage] = useState("");

  useEffect(() => { onTokenChangeRef.current = onTokenChange; }, [onTokenChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return;
    let cancelled = false;

    loadRecaptcha()
      .then(() => {
        if (cancelled || !window.grecaptcha) return;
        container.innerHTML = "";
        window.grecaptcha.render(container, {
          sitekey: siteKey,
          theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          callback: (token) => { setMessage(""); onTokenChangeRef.current(token); },
          "expired-callback": () => onTokenChangeRef.current(""),
          "error-callback": () => {
            onTokenChangeRef.current("");
            setMessage("Security check failed. Please reload and try again.");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not load the security check. Disable ad blockers and reload.");
      });

    return () => { cancelled = true; container.innerHTML = ""; };
  }, [siteKey]);

  if (!siteKey) {
    return <div className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-3 text-xs leading-5 text-red-200">reCAPTCHA site key is not configured.</div>;
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-[78px]" aria-label="Security verification" />
      {message && <p className="mt-2 text-xs text-red-300">{message}</p>}
    </div>
  );
}
