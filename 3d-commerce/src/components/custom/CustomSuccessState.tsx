"use client";

import Link from "next/link";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";

import type { CustomSubmission } from "./CustomForm";

export function CustomSuccessState({ requestId, price, bodyLabel, headLabel, sizeLabel, frameLabel }: CustomSubmission) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full rounded-[32px] border border-border bg-surface/60 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-10 lg:p-12">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[24px] border border-primary/30 bg-primary/10 text-primary sm:h-20 sm:w-20 sm:rounded-[26px]">
          <IconCheck size={34} />
        </div>

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[11px]">
          Request received
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Your custom request is with our team.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">
          Your reference photos and requirements have been securely submitted. We&apos;ll review the request and contact you with the next production step.
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Body", bodyLabel],
            ["Head", headLabel],
            ["Size", sizeLabel],
            ["Estimate", `₹${price.toLocaleString("en-IN")}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-background/45 p-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
              <p className="mt-2 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          Request ID: <span className="font-mono text-foreground">{requestId}</span>
        </p>
        <p className="mt-1 text-xs text-muted">Frame: {frameLabel}</p>

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-border bg-background/40 p-5 text-left">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">What happens next</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Step number="01" title="Team review" text="We review your references and requirements." />
            <Step number="02" title="Production planning" text="We confirm the physical build details and production path." />
            <Step number="03" title="Physical order" text="Once the build is ready to order, you can place the physical order and pay securely." />
          </div>
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-xs font-semibold text-background transition hover:opacity-90">
          Back to home <IconArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">{number}</span>
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-muted">{text}</p>
    </div>
  );
}
