"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconMailCheck,
  IconRefresh,
  IconShieldCheck,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { resendVerificationEmail, verifyEmail } from "@/lib/auth-client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const email = useMemo(() => searchParams.get("email")?.trim().toLowerCase() ?? "", [searchParams]);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) return;
      setStatus("verifying");

      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        setMessage(result);
        setStatus("success");
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "This verification link is invalid or expired.");
        setStatus("error");
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend() {
    if (!email || isResending) return;
    setIsResending(true);
    setResendError("");

    try {
      await resendVerificationEmail(email);
      setResent(true);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Unable to resend the verification email.");
    } finally {
      setIsResending(false);
    }
  }

  const isVerifying = status === "verifying";
  const verified = status === "success";
  const failed = status === "error";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[14%] top-[19%] h-72 w-72 rounded-full bg-primary/[0.1] blur-[115px]" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-violet-500/[0.05] blur-[125px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.055),transparent_34%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-28">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.07))] shadow-[0_30px_110px_rgba(0,0,0,0.28)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative hidden min-h-[590px] overflow-hidden border-r border-white/[0.08] p-10 lg:flex lg:flex-col lg:justify-between">
            <div aria-hidden="true" className="absolute right-[-18%] top-[-18%] h-72 w-72 rounded-full bg-primary/[0.09] blur-3xl" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-primary"><IconSparkles size={13} /> Verify your email</div>
              <h1 className="mt-8 max-w-md font-serif text-5xl leading-[0.98] tracking-[-0.055em] xl:text-6xl">One small step.<span className="block text-primary">More confidence.</span></h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-muted">Verify your email to protect your account and make sure important order updates reach you.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.07] text-primary"><IconShieldCheck size={17} /></span><p className="text-xs leading-5 text-muted">Only use the verification link sent to the email you control.</p></div></div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
                {failed ? <IconX size={27} stroke={1.6} /> : <IconMailCheck size={27} stroke={1.6} />}
              </div>
              <p className="mt-7 text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Email verification</p>
              <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
                {verified ? "Email verified" : failed ? "Verification failed" : isVerifying ? "Verifying your email" : "Check your inbox"}
              </h2>

              {verified || failed || isVerifying || !token ? (
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
                  {verified
                    ? message
                    : failed
                      ? message
                      : isVerifying
                        ? "Please wait while we securely activate your account."
                        : email
                          ? <>We&apos;ve sent a verification link to <span className="font-medium text-foreground">{email}</span>. Open it to activate your account.</>
                          : "Open the verification link from your email to activate your account."}
                </p>
              ) : null}

              {!failed && !isVerifying && !verified && (
                <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left">
                  <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.06] text-primary"><IconCheck size={15} /></span><div><p className="text-sm font-medium">What happens next?</p><p className="mt-1 text-xs leading-5 text-muted">Verify your email, then continue to your account and start ordering.</p></div></div>
                </div>
              )}

              {!verified && email && (
                <>
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={() => void handleResend()}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.025] text-[10px] font-semibold uppercase tracking-[0.14em] transition-all hover:border-primary/20 hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconRefresh size={15} />
                    {isResending ? "Sending…" : resent ? "Verification email resent" : "Resend verification email"}
                  </button>
                  {resendError && <p role="alert" className="mt-3 text-xs leading-5 text-red-200">{resendError}</p>}
                </>
              )}

              <Link href="/login" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_16px_42px_hsl(var(--primary)/0.18)] transition-all hover:-translate-y-0.5">
                {verified ? "Continue to sign in" : "Back to sign in"} <IconArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
