"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight, IconX } from "@tabler/icons-react";

export function AuthPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsOpen(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setConfirmPassword("");
    setError("");
  }, [mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        className="relative w-full max-w-md rounded-3xl border border-border bg-background p-6 text-foreground shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close login and signup popup"
          className="absolute right-4 top-4 rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <IconX size={18} />
        </button>

        <div className="pr-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Welcome to Forma
          </p>
          <h2 id="auth-prompt-title" className="mt-3 font-serif text-3xl leading-tight">
            Make your collection personal.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Sign in or create an account to save favourites, manage orders, and enjoy a smoother shopping experience.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${mode === "signup" ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            Sign up
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            if (mode === "signup") {
              const form = event.currentTarget;
              const password = (form.elements.namedItem("password") as HTMLInputElement | null)?.value ?? "";
              if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }
            }
          }}
        >
          {mode === "signup" && (
            <label className="block text-sm font-medium">
              Full name
              <input required name="name" type="text" placeholder="Your name" autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary" />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email address
            <input required name="email" type="email" placeholder="you@example.com" autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input required name="password" type="password" minLength={8} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary" />
          </label>
          {mode === "signup" && (
            <label className="block text-sm font-medium">
              Confirm password
              <input required name="confirmPassword" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary" />
            </label>
          )}

          <div className="rounded-xl border border-border bg-surface/60 p-3 text-xs text-muted">
            CAPTCHA placeholder: connect your chosen CAPTCHA provider here before production authentication.
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link href="/login" className="flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-primary/40">
              Full page sign in
            </Link>
            <Link href="/register" className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              {mode === "login" ? "Sign in" : "Create account"}
              <IconArrowRight size={17} />
            </Link>
          </div>
        </form>

        <p className="mt-4 text-center text-xs leading-5 text-muted">
          You can close this popup and continue browsing anytime.
        </p>
      </section>
    </div>
  );
}
