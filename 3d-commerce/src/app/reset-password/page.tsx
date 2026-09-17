"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { resetPassword } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      setComplete(true);
      window.setTimeout(() => router.replace("/login"), 900);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[20%] h-72 w-72 rounded-full bg-primary/[0.1] blur-[115px]" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-violet-500/[0.055] blur-[120px]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.07))] shadow-[0_30px_110px_rgba(0,0,0,0.28)] lg:grid-cols-[0.78fr_1.22fr]">
          <div className="relative hidden min-h-[600px] overflow-hidden border-r border-white/[0.08] p-10 lg:flex lg:flex-col lg:justify-between">
            <div aria-hidden="true" className="absolute right-[-20%] top-[-20%] h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-primary"><IconSparkles size={13} /> Secure reset</div>
              <h1 className="mt-8 font-serif text-5xl leading-[1] tracking-[-0.055em] xl:text-6xl">Choose a new<br /><span className="text-primary">key.</span></h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-muted">Create a strong new password, then return to your account and continue where you left off.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.07] text-primary"><IconShieldCheck size={17} /></span><p className="text-xs leading-5 text-muted">Use at least 8 characters and avoid passwords you already use elsewhere.</p></div>
            </div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <Link href="/login" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"><IconArrowLeft size={14} /> Back to sign in</Link>
              <div className="mt-8"><p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Reset password</p><h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">New password</h2><p className="mt-3 text-sm leading-6 text-muted">Set a new password for your account.</p></div>

              {!complete ? (
                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  <label className="block"><span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">New password</span><div className="relative"><IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="8+ characters" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04]" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle new password visibility" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-foreground">{showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button></div></label>
                  <label className="block"><span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Confirm password</span><div className="relative"><IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirm ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="Repeat your password" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04]" /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label="Toggle confirmation password visibility" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-foreground">{showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button></div></label>
                  {error && <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-200">{error}</div>}
                  <button type="submit" disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Updating…" : "Update password"} {!isSubmitting && <IconArrowRight size={15} />}</button>
                </form>
              ) : (
                <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/[0.05] p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary"><IconCheck size={17} /></span><div><p className="text-sm font-medium">Password updated</p><p className="mt-1 text-xs leading-5 text-muted">Your password has been changed and active sessions have been revoked.</p></div></div><Link href="/login" className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.025] text-[10px] font-semibold uppercase tracking-[0.14em] hover:border-primary/20">Return to sign in</Link></div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
