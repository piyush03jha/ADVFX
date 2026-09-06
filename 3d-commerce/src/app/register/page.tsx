"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowRight,
  IconBrandGoogle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[18%] h-80 w-80 rounded-full bg-primary/[0.1] blur-[120px]" />
        <div className="absolute bottom-[6%] right-[7%] h-96 w-96 rounded-full bg-violet-500/[0.055] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_0%,hsl(var(--primary)/0.055),transparent_34%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_48%,hsl(var(--primary)/0.07))] shadow-[0_32px_120px_rgba(0,0,0,0.3)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative hidden min-h-[730px] overflow-hidden border-r border-white/[0.08] lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div aria-hidden="true" className="absolute -right-24 top-[12%] h-72 w-72 rounded-full bg-primary/[0.09] blur-3xl" />
            <div aria-hidden="true" className="absolute -left-28 bottom-[8%] h-80 w-80 rounded-full bg-white/[0.025] blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
                <IconSparkles size={13} />
                Start your collection
              </div>
              <h1 className="mt-8 max-w-lg font-serif text-5xl leading-[0.98] tracking-[-0.055em] xl:text-6xl">
                Made for moments
                <span className="block text-primary">worth keeping.</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-muted">
                Create an account to save your details, follow every order and make checkout effortless.
              </p>
            </div>

            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
                  <IconShieldCheck size={18} />
                </span>
                <div>
                  <p className="text-xs font-medium text-foreground">One account for everything</p>
                  <p className="mt-1 text-[10px] leading-5 text-muted">Orders, delivery details, saved preferences and more.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  "Custom builds",
                  "3D collections",
                  "Order tracking",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-center text-[9px] uppercase tracking-[0.12em] text-muted">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center p-6 sm:p-8 lg:p-12">
            <div className="mx-auto w-full max-w-lg">
              <div className="mb-7">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Create account</p>
                <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">Join the studio</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted">A few details now. Everything else stays simple.</p>
              </div>

              <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.025] text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-white/[0.05]">
                <IconBrandGoogle size={17} />
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[9px] uppercase tracking-[0.16em] text-muted/70">or create with email</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Full name</span>
                  <div className="relative">
                    <IconUser size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="text" required placeholder="Your full name" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Email address</span>
                  <div className="relative">
                    <IconMail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="email" required placeholder="you@example.com" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Password</span>
                    <div className="relative">
                      <IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input type={showPassword ? "text" : "password"} required minLength={8} placeholder="8+ characters" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                      <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground">
                        {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Confirm password</span>
                    <div className="relative">
                      <IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input type={showConfirmPassword ? "text" : "password"} required minLength={8} placeholder="Repeat password" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                      <button type="button" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground">
                        {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </button>
                    </div>
                  </label>
                </div>

                <label className="flex cursor-pointer gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-xs leading-5 text-muted">
                  <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[hsl(var(--primary))]" />
                  <span>
                    I agree to the <Link href="/terms" className="text-foreground underline decoration-white/20 underline-offset-4 hover:decoration-primary">Terms of Service</Link> and <Link href="/privacy" className="text-foreground underline decoration-white/20 underline-offset-4 hover:decoration-primary">Privacy Policy</Link>.
                  </span>
                </label>

                <button type="submit" disabled={!acceptTerms} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_52px_hsl(var(--primary)/0.25)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
                  Create account
                  <IconArrowRight size={15} />
                </button>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted">
                <IconCheck size={15} className="text-primary" />
                Email verification keeps your account secure.
              </div>

              <p className="mt-5 text-center text-xs text-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary transition-colors hover:text-foreground">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
