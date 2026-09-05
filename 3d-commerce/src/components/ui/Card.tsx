import type {
  HTMLAttributes,
  ReactNode,
} from "react";

type CardProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    interactive?: boolean;
  };

export function Card({
  children,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={`
        card-premium
        overflow-hidden
        rounded-2xl
        ${interactive ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}