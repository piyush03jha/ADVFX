import type { ReactNode } from "react";

import { Container } from "./Container";

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  glow?: boolean;
};

export function Section({
  children,
  id,
  className = "",
  containerClassName = "",
  glow = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`
        relative
        py-20
        sm:py-24
        lg:py-28
        ${glow ? "section-glow" : ""}
        ${className}
      `}
    >
      <Container
        className={containerClassName}
      >
        {children}
      </Container>
    </section>
  );
}