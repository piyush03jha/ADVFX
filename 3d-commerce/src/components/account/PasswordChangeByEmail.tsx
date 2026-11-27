"use client";

import { useState } from "react";
import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { useAuthCaptcha } from "@/lib/auth-captcha";
import { requestPasswordReset } from "@/lib/auth-client";

export function PasswordChangeByEmail({ email, onClose }: { email: string; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const captcha = useAuthCaptcha("forgot-password");
  const captchaToken = captcha.provider === "turnstile" ? captcha.token : captcha.challenge?.token ?? "";
  const canSend = Boolean(email && captcha.provider && captchaToken && (captcha.provider !== "math" || captcha.answer));

  async function sendLink() {
    if (sending || sent || captcha.isLoading || !canSend) return;
    setSending(true);
    setError("");
    try {
      await requestPasswordReset(email, captchaToken, captcha.provider === "math" ? captcha.answer : "");
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request a password change.");
      await captcha.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background/50 p-5 sm:p-7">
      <h3 className="text-sm font-semibold text-foreground">Change your password</h3>
      <p className="mt-2 text-xs leading-5 text-muted">You do not need your current password. For security, use the link sent to your account email to choose a new password.</p>
      <div className="mt-4 rounded-xl border border-border bg-surface p-3">
        <p className="text-[11px] text-muted">Account email</p>
        <p className="mt-1 break-all text-sm font-medium text-foreground">{email}</p>
      </div>
      {sent ? (
        <div role="status" className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs leading-5 text-foreground">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">If a reset link was requested recently, use the latest email. Otherwise, check your inbox or spam folder for the new link. The link expires in 30 minutes. After changing your password, sign in again.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3" onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void sendLink(); } }}>
          {captcha.provider === "turnstile" ? <AuthCaptcha key={captcha.version} purpose="forgot-password" onTokenChange={captcha.setTurnstileToken} siteKey={captcha.siteKey} /> : captcha.challenge ? <MathCaptcha {...captcha.challenge} answer={captcha.answer} onAnswerChange={captcha.setAnswer} onRefresh={() => void captcha.refresh()} /> : <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted">{captcha.error || "Preparing security check…"}{captcha.error && <button type="button" className="ml-2 text-primary underline" onClick={() => void captcha.refresh()}>Retry</button>}</div>}
          {error && <p role="alert" className="text-xs text-error">{error}</p>}
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={sending} onClick={onClose} className="min-h-11 rounded-xl border border-border px-4 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50">{sent ? "Done" : "Cancel"}</button>
        {!sent && <button type="button" disabled={sending || captcha.isLoading || !canSend} onClick={() => void sendLink()} className="min-h-11 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Send password change link"}</button>}
      </div>
    </div>
  );
}
