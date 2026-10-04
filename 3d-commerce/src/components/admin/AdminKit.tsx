"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AdminPage({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="pt-6">{children}</div>
    </main>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={className}>{children}</Card>;
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="min-w-full text-left text-xs">{children}</table>
    </div>
  );
}

export function AdminTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-elevated text-[11px] uppercase tracking-[0.12em] text-muted">
      <tr>{children}</tr>
    </thead>
  );
}

export function AdminButton({
  children,
  variant = "outline",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <Button
      type={props.type ?? "button"}
      variant={variant}
      size="sm"
      disabled={props.disabled}
      aria-label={props["aria-label"]}
      aria-pressed={props["aria-pressed"]}
      className={props.className}
      onClick={props.onClick}
      form={props.form}
      name={props.name}
      value={props.value}
    >
      {children}
    </Button>
  );
}
