import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variants: Record<
  BadgeVariant,
  string
> = {
  default: `
    border-border
    bg-surface-elevated/70
    text-muted
  `,

  primary: `
    border-primary/20
    bg-primary/10
    text-primary-hover
  `,

  success: `
    border-success/20
    bg-success/10
    text-success
  `,

  warning: `
    border-warning/20
    bg-warning/10
    text-warning
  `,
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-medium
        uppercase
        tracking-[0.12em]
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}