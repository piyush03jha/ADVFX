"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight, IconX } from "@tabler/icons-react";
import { MathCaptcha } from "@/components/auth/MathCaptcha";

function createCaptcha() {
  const first = Math.floor(Math.random() * 9) + 1;
  const second = Math.floor(Math.random() * 9) + 1;
  const subtract = Math.random() > 0.5;
  return {
    first: subtract ? Math.max(first, second) : first,
    second: subtract ? Math.min(first, second) : second,
    operator: subtract ? ("−" as const) : ("+" as const),
  };
}

export function AuthPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captcha, setCaptcha] = useState(createCaptcha);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const pathname = window.location.pathname;
    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");

    if (isAuthPage) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setIsOpen(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setConfirmPassword("");
    setError("");
  }, [mode]);

  function refreshCaptcha() {
    setCaptcha(createCaptcha());
    setCaptchaAnswer("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const expected = captcha.operator === "+" ? captcha.first + captcha.second : captcha.first - captcha.second;
    if (Number(captchaAnswer) !== expected) {
      setError("Incorrect CAPTCHA answer. Please try again.");
      refreshCaptcha();
      return;
    }
    if (mode === "signup") {
      const form = event.currentTarget;
      const password = (form.elements.namedItem("password") as HTMLInputElement | null)?.value ?? "";
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    window.location.href = mode === "login" ? "/login" : "/register";
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title" className="relative w-full max-w-md rounded-3xl border border-border bg-background p-6 text-foreground shadow-2xl sm:p-8">
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close login and signup popup" className="absolute right-4 top-4 rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconX size={18} /></button>
        <div className="pr-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Welcome to Forma</p>
          <h2 id="auth-prompt-title" className="mt-3 font-serif text-3xl leading-tight">Make your collection personal.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Sign in or create an account to save favourites, manage orders, and enjoy a smoother shopping experience.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 rounded-full border border-border bg-surface p-1">
          <button type="button" onClick={() => setMode("login")} className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>Log in</button>
          <button type="button" onClick={() => setMode("signup")} className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${mode === "signup" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>Sign up</button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && <label className="block text-sm font-medium">Full name<input required name="name" type="text" placeholder="Your name" autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary" /></label>}
          <label className="block text-sm font-medium">Email address<input required name="email" type="email" placeholder="you@example.com" autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary" /></label>
          <label className="block text-sm font-medium">Password<input required name="password" type="password" minLength={8} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary" /></label>
          {mode === "signup" && <label className="block text-sm font-medium">Confirm password<input required name="confirmPassword" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary" /></label>}
          <MathCaptcha {...captcha} answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onRefresh={refreshCaptcha} />
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/login" onClick={() => setIsOpen(false)} className="flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-primary/40">Full page sign in</Link>
            <button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">{mode === "login" ? "Sign in" : "Create account"}<IconArrowRight size={17} /></button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs leading-5 text-muted">You can close this popup and continue browsing anytime.</p>
      </section>
    </div>
  );
}
