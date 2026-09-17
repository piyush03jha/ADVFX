"use client";

import { useEffect } from "react";

type AuthCaptchaProps = {
  onTokenChange: (token: string) => void;
  siteKey?: string;
};

/**
 * Provider-neutral CAPTCHA slot. Set NEXT_PUBLIC_CAPTCHA_SITE_KEY once a
 * provider (for example, Cloudflare Turnstile or reCAPTCHA) is selected.
 * The authentication submit handlers should refuse submission without a
 * verified token in production.
 */
export function AuthCaptcha({ onTokenChange, siteKey }: AuthCaptchaProps) {
  useEffect(() => {
    onTokenChange("");
  }, [onTokenChange]);

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 px-3 py-3 text-xs leading-5 text-muted">
        CAPTCHA will appear here when <code>NEXT_PUBLIC_CAPTCHA_SITE_KEY</code> is configured.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3 text-xs leading-5 text-muted">
      CAPTCHA provider is configured, but its widget adapter is not installed yet. Connect the provider here and pass its verified token through <code>onTokenChange</code> before enabling production auth.
    </div>
  );
}
