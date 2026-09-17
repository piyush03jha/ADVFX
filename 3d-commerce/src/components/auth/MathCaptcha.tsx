"use client";

import { IconRefresh } from "@tabler/icons-react";

type MathCaptchaProps = {
  first: number;
  second: number;
  operator: "+" | "−";
  answer: string;
  onAnswerChange: (value: string) => void;
  onRefresh: () => void;
};

export function MathCaptcha({
  first,
  second,
  operator,
  answer,
  onAnswerChange,
  onRefresh,
}: MathCaptchaProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
            Security check
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Solve: {first} {operator} {second} = ?
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Generate a new CAPTCHA"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <IconRefresh size={16} />
        </button>
      </div>
      <input
        required
        inputMode="numeric"
        pattern="[0-9]+"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Enter the answer"
        aria-label="CAPTCHA answer"
        className="mt-3 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
      />
    </div>
  );
}
