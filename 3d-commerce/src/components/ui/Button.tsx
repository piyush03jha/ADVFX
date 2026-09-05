import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "outline"
  | "ghost";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};

const variants: Record<
  ButtonVariant,
  string
> = {
  primary: `
    gradient-primary
    border
    border-primary/10
    text-white

    shadow-[0_8px_25px_rgba(109,40,217,0.28),0_0_35px_rgba(139,92,246,0.12)]

    hover:brightness-110
    hover:border-primary/50

    hover:shadow-[0_10px_30px_rgba(109,40,217,0.38),0_0_45px_rgba(139,92,246,0.20)]

    active:scale-[0.98]
  `,

  outline: `
    border
    border-border
    bg-transparent
    text-foreground

    hover:border-primary/60
    hover:bg-primary/[0.06]
    hover:text-primary-hover

    hover:shadow-[0_0_24px_rgba(139,92,246,0.08)]
  `,

  ghost: `
    border
    border-transparent
    bg-transparent
    text-muted

    hover:bg-surface
    hover:text-foreground
  `,
};

const sizes: Record<
  ButtonSize,
  string
> = {
  sm: `
    min-h-9
    px-4
    text-xs
  `,

  md: `
    min-h-11
    px-6
    text-sm
  `,

  lg: `
    min-h-12
    px-7
    text-sm
    sm:text-base
  `,
};

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled = false,
  ariaLabel,
  onClick,
}: ButtonProps) {
  const baseStyles = `
    inline-flex
    items-center
    justify-center
    gap-2
    rounded-full
    font-medium
    tracking-[-0.01em]

    transition-[transform,background-color,border-color,box-shadow,filter]
    duration-300
    ease-out

    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-primary
    focus-visible:ring-offset-2
    focus-visible:ring-offset-background

    disabled:pointer-events-none
    disabled:opacity-50
  `;

  const classes = `
    ${baseStyles}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={
          disabled || undefined
        }
        tabIndex={
          disabled ? -1 : undefined
        }
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}