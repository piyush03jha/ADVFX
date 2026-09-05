import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({
  children,
  className = "",
}: ContainerProps) {
  return (
    <div
      className={`
        mx-auto
        w-full
        max-w-[1440px]
        px-3
        sm:px-5
        lg:px-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}