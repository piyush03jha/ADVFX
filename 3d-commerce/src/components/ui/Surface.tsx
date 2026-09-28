import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  inset?: boolean;
};

export function Surface({ children, inset = false, className = "", ...props }: SurfaceProps) {
  return (
    <div
      {...props}
      className={`${inset ? "surface-inset" : "surface"} rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}
