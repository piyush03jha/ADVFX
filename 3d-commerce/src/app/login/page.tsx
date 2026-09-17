"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { IconArrowRight, IconEye, IconEyeOff, IconLock, IconMail, IconShieldCheck, IconSparkles } from "@tabler/icons-react";
import { Navbar } from "@/components/layout/SiteNavbar";
import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { loginUser } from "@/lib/auth-client";
import { useAuth } from "@/context/AuthContext";
import { useAuthCaptcha } from "@/lib/auth-captcha";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const returnTo = getSafeReturnPath(searchParams.get("returnTo"));
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { challenge, answer: captchaAnswer, setAnswer: setCaptchaAnswer, isLoading: isCaptchaLoading, error: captchaError, refresh: refreshCaptcha } = useAuthCaptcha("login");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!challenge) {
      setError(captchaError || "Security check is still loading.");
      return;
    }

    setIsSubmitting(true);

    try {
      // loginUser validates the BFF response and only resolves after the
      // authentication cookie has been issued successfully.
      await loginUser(email, password, challenge.token, captchaAnswer);

      // Update the in-memory auth state first, then navigate. Awaiting this
      // avoids leaving the login screen while the provider still sees the user
      // as anonymous.
      const sessionUser = await refreshSession();

      if (!sessionUser) {
        throw new Error("Sign-in succeeded, but the new session could not be loaded. Please try again.");
      }

      router.replace(returnTo);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to sign in.");
      await refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_48%,hsl(var(--primary)/0.07))] shadow-[0_32px_120px_rgba(0,0,0,0.3)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[690px] overflow-hidden border-r border-white/[0.08] lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-primary"><IconSparkles size={13} />Private studio access</div><h1 className="mt-8 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.055em] xl:text-6xl">Your collection,<span className="block text-primary">beautifully personal.</span></h1><p className="mt-6 max-w-md text-sm leading-7 text-muted">Sign in to manage orders, follow production progress and keep your custom creations in one place.</p></div>
            <div className="space-y-3">{["Track production and delivery in real time","Keep your saved addresses and preferences ready","Secure checkout for physical orders"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5"><IconShieldCheck size={16} className="text-primary" /><span className="text-xs leading-5 text-muted">{item}</span></div>)}</div>
          </div>
          <div className="flex items-center p-6 sm:p-8 lg:p-12"><div className="mx-auto w-full max-w-md">
            <div className="mb-8"><p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Welcome back</p><h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">Sign in</h2><p className="mt-3 text-sm leading-6 text-muted">Access your account to continue your order.</p></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Email address</span><div className="relative"><IconMail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" placeholder="you@example.com" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary/40" /></div></label>
              <label className="block"><div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Password</span><Link href="/forgot-password" className="text-[10px] text-muted hover:text-primary">Forgot password?</Link></div><div className="relative"><IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required autoComplete={remember ? "current-password" : "off"} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none focus:border-primary/40" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted">{showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button></div></label>
              {challenge ? <MathCaptcha {...challenge} answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onRefresh={() => void refreshCaptcha()} /> : <CaptchaLoading error={captchaError} />}
              <label className="flex cursor-pointer items-center gap-3 pt-1 text-xs text-muted"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />Keep me signed in on this device</label>
              {error && <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs text-red-200">{error}</div>}
              <button type="submit" disabled={isSubmitting || isCaptchaLoading || !challenge} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-60">{isSubmitting ? "Signing in…" : "Sign in"}{!isSubmitting && <IconArrowRight size={15} />}</button>
            </form>
            <p className="mt-7 text-center text-xs text-muted">New to the studio? <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="font-medium text-primary hover:text-foreground">Create an account</Link></p>
            <p className="mt-6 text-center text-[9px] leading-5 text-muted/70">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          </div></div>
        </div>
      </section>
    </main>
  );
}

function getSafeReturnPath(value: string | null) { if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account"; return value; }

function CaptchaLoading({ error }: { error: string }) { return <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted">{error || "Preparing security check…"}</div>; }
