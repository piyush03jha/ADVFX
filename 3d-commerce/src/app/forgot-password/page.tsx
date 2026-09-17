"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMail,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [developmentToken, setDevelopmentToken] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
      setDevelopmentToken(result.developmentToken ?? "");
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to request a password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[22%] h-72 w-72 rounded-full bg-primary/[0.1] blur-[115px]" />
        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-violet-500/[0.05] blur-[120px]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.07))] shadow-[0_30px_110px_rgba(0,0,0,0.28)] lg:grid-cols-[0.78fr_1.22fr]">
          <div className="relative hidden min-h-[560px] overflow-hidden border-r border-white/[0.08] p-10 lg:flex lg:flex-col lg:justify-between">
            <div aria-hidden="true" className="absolute right-[-20%] top-[-20%] h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-primary"><IconSparkles size={13} /> Account recovery</div>
              <h1 className="mt-8 font-serif text-5xl leading-[1] tracking-[-0.055em] xl:text-6xl">A secure way<br />back in.</h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-muted">We will send a private recovery link to the email connected to your account.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.07] text-primary"><IconShieldCheck size={17} /></span>
                <p className="text-xs leading-5 text-muted">Recovery links expire for your protection and should only be opened by you.</p>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <Link href="/login" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"><IconArrowLeft size={14} /> Back to sign in</Link>
              <div className="mt-8">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Forgot password</p>
                <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">Reset access</h2>
                <p className="mt-3 text-sm leading-6 text-muted">Enter your account email and we&apos;ll send a reset link.</p>
              </div>

              {!sent ? (
                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Email address</span>
                    <div className="relative">
                      <IconMail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" placeholder="you@example.com" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                    </div>
                  </label>
                  {error && <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-200">{error}</div>}
                  <button type="submit" disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Sending…" : "Send reset link"} {!isSubmitting && <IconArrowRight size={15} />}</button>
                </form>
              ) : (
                <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/[0.05] p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary"><IconCheck size={17} /></span>
                    <div><p className="text-sm font-medium">Check your inbox</p><p className="mt-1 text-xs leading-5 text-muted">If the account exists, password reset instructions have been sent.</p></div>
                  </div>
                  {developmentToken && (
                    <div className="mt-5 rounded-xl border border-yellow-300/15 bg-yellow-200/[0.04] p-3 text-left">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-yellow-100">Development only</p>
                      <p className="mt-1 break-all font-mono text-[10px] leading-5 text-yellow-50/80">{developmentToken}</p>
                      <Link href={`/reset-password?token=${encodeURIComponent(developmentToken)}`} className="mt-3 inline-flex text-[10px] font-semibold uppercase tracking-[0.12em] text-primary hover:text-foreground">Open reset page <IconArrowRight size={13} className="ml-1" /></Link>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-7 text-center text-xs text-muted">Remembered your password? <Link href="/login" className="font-medium text-primary hover:text-foreground">Sign in</Link></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
