"use client";

import Link from "next/link";
import { IconArrowRight, IconCheck, IconSparkles } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";

export default function VerifyEmailSuccessPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[14%] top-[20%] h-72 w-72 rounded-full bg-primary/[0.1] blur-[115px]" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-violet-500/[0.05] blur-[125px]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.08))] p-7 text-center shadow-[0_30px_110px_rgba(0,0,0,0.28)] sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary shadow-[0_0_40px_hsl(var(--primary)/0.1)]"><IconCheck size={29} stroke={1.6} /></div>
          <p className="mt-7 inline-flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.2em] text-primary"><IconSparkles size={13} /> Account verified</p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">You&apos;re all set.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">Your email has been verified successfully. Continue to sign in and access your account.</p>
          <Link href="/login" className="mx-auto mt-8 inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5">Continue to sign in <IconArrowRight size={15} /></Link>
        </div>
      </section>
    </main>
  );
}
