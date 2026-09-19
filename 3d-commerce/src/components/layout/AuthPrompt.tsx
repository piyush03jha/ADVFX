"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight, IconX } from "@tabler/icons-react";

import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { useAuth } from "@/context/AuthContext";
import { loginUser, registerUser } from "@/lib/auth-client";
import { useAuthCaptcha } from "@/lib/auth-captcha";

export function AuthPrompt() {
  const { isAuthenticated, isLoading: isAuthLoading, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    challenge,
    answer: captchaAnswer,
    setAnswer: setCaptchaAnswer,
    isLoading: isCaptchaLoading,
    error: captchaError,
    refresh: refreshCaptcha,
  } = useAuthCaptcha(mode);

  useEffect(() => {
    const pathname = window.location.pathname;
    const isAuthPage =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/auth/");

    if (isAuthPage || isAuthenticated || isAuthLoading) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setIsOpen(true), 4000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    const handleNavigation = () => {
      const pathname = window.location.pathname;
      const isAuthPage =
        pathname === "/login" ||
        pathname === "/register" ||
        pathname.startsWith("/auth/");

      if (isAuthPage) setIsOpen(false);
    };

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("routechange", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("routechange", handleNavigation);
    };
  }, []);

  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCaptchaAnswer("");
    setError("");
  }, [mode, setCaptchaAnswer]);

  function closePopup() {
    setIsOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!challenge) {
      setError(captchaError || "Security check is still loading.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await loginUser(email, password, challenge.token, captchaAnswer);

        const sessionUser = await refreshSession();
        if (!sessionUser) {
          throw new Error(
            "Sign-in succeeded, but the new session could not be loaded. Please try again.",
          );
        }

        setIsOpen(false);
        return;
      }

      const result = await registerUser(
        name,
        email,
        password,
        challenge.token,
        captchaAnswer,
      );

      const params = new URLSearchParams({
        email: email.trim().toLowerCase(),
      });

      if (result.emailDeliveryPending) {
        params.set("delivery", "pending");
      }

      setIsOpen(false);
      window.location.href = `/verify-email?${params.toString()}`;
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : mode === "login"
            ? "Unable to sign in."
            : "Unable to create your account.",
      );
      await refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || isAuthenticated || isAuthLoading) return null;

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
          onClick={closePopup}
          aria-label="Close login and signup popup"
          className="absolute right-4 top-4 rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <IconX size={18} />
        </button>

        <div className="pr-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Welcome to Forma
          </p>
          <h2
            id="auth-prompt-title"
            className="mt-3 font-serif text-3xl leading-tight"
          >
            Make your collection personal.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Sign in or create an account to save favourites, manage orders, and
            enjoy a smoother shopping experience.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="block text-sm font-medium">
              Full name
              <input
                required
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="block text-sm font-medium">
            Email address
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              required
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              placeholder="••••••••"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
            />
          </label>

          {mode === "signup" && (
            <label className="block text-sm font-medium">
              Confirm password
              <input
                required
                name="confirmPassword"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
              />
            </label>
          )}

          {challenge ? (
            <MathCaptcha
              {...challenge}
              answer={captchaAnswer}
              onAnswerChange={setCaptchaAnswer}
              onRefresh={() => void refreshCaptcha()}
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted">
              {captchaError || "Preparing security check…"}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href={
                mode === "login"
                  ? "/login"
                  : "/register"
              }
              onClick={closePopup}
              className="flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-primary/40"
            >
              Full page {mode === "login" ? "sign in" : "sign up"}
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || isCaptchaLoading || !challenge}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!isSubmitting && <IconArrowRight size={17} />}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs leading-5 text-muted">
          You can close this popup and continue browsing anytime.
        </p>
      </section>
    </div>
  );
}
