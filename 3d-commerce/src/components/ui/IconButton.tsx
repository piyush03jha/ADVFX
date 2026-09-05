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
    border
    border-border
    bg-surface-elevated/80
    text-foreground
    hover:border-primary/50
    hover:bg-primary/10
    hover:text-primary-hover
  `,

  primary: `
    border
    border-primary/20
    bg-primary/15
    text-primary-hover
    hover:bg-primary/25
    hover:border-primary/40
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
        inline-flex
        shrink-0
        items-center
        justify-center
        rounded-full
        transition-all
        duration-300
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}