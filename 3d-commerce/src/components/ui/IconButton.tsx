import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type IconButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    label: string;
    size?: "sm" | "md" | "lg";
    variant?: "default" | "primary" | "ghost";
  };

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-11 w-11",
};

const variants = {
  default: `
    border border-border
    bg-surface-elevated
    text-foreground
    hover:border-primary/45
    hover:bg-surface
    hover:text-primary-hover
  `,
  primary: `
    border border-primary/20
    bg-primary/12
    text-primary-hover
    hover:bg-primary/20
    hover:border-primary/40
  `,
  ghost: `
    border border-transparent
    bg-transparent
    text-muted
    hover:bg-surface
    hover:text-foreground
  `,
};

export function IconButton({
  children,
  label,
  size = "md",
  variant = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      className={`
        inline-flex shrink-0 items-center justify-center rounded-full
        transition-[color,background-color,border-color,box-shadow,transform]
        duration-300
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary focus-visible:ring-offset-2
        focus-visible:ring-offset-background
        disabled:pointer-events-none disabled:opacity-50
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
