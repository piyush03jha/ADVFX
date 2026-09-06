"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowRight,
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[20%] h-72 w-72 rounded-full bg-primary/[0.11] blur-[110px]" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-fuchsia-500/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.06),transparent_32%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_48%,hsl(var(--primary)/0.07))] shadow-[0_32px_120px_rgba(0,0,0,0.3)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[690px] overflow-hidden border-r border-white/[0.08] lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div aria-hidden="true" className="absolute -left-28 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-primary/[0.1] blur-3xl" />
            <div aria-hidden="true" className="absolute right-[-25%] top-[-15%] h-[26rem] w-[26rem] rounded-full bg-white/[0.025] blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
                <IconSparkles size={13} />
                Private studio access
              </div>
              <h1 className="mt-8 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.055em] text-foreground xl:text-6xl">
                Your collection,
                <span className="block text-primary">beautifully personal.</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-muted">
                Sign in to manage orders, follow production progress and keep your custom creations in one place.
              </p>
            </div>

            <div className="relative space-y-3">
              {[
                "Track production and delivery in real time",
                "Keep your saved addresses and preferences ready",
                "Secure checkout for physical orders",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 backdrop-blur-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.07] text-primary">
                    <IconShieldCheck size={16} />
                  </span>
                  <span className="text-xs leading-5 text-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center p-6 sm:p-8 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Welcome back</p>
                <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">Sign in</h2>
                <p className="mt-3 text-sm leading-6 text-muted">Access your account to continue your order.</p>
              </div>

              <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.025] text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-white/[0.05]">
                <IconBrandGoogle size={17} />
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[9px] uppercase tracking-[0.16em] text-muted/70">or continue with email</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Email address</span>
                  <div className="relative">
                    <IconMail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="email" required placeholder="you@example.com" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.15em] text-muted">Password</span>
                    <Link href="/forgot-password" className="text-[10px] text-muted transition-colors hover:text-primary">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type={showPassword ? "text" : "password"} required placeholder="Enter your password" className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] pl-10 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted/50 focus:border-primary/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]" />
                    <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground">
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3 pt-1 text-xs text-muted">
                  <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-transparent accent-[hsl(var(--primary))]" />
                  Keep me signed in on this device
                </label>

                <button type="submit" className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_52px_hsl(var(--primary)/0.25)]">
                  Sign in
                  <IconArrowRight size={15} />
                </button>
              </form>

              <p className="mt-7 text-center text-xs text-muted">
                New to the studio?{" "}
                <Link href="/register" className="font-medium text-primary transition-colors hover:text-foreground">Create an account</Link>
              </p>

              <p className="mt-6 text-center text-[9px] leading-5 text-muted/70">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
