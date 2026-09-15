import { Container } from "@/components/ui/Container";

export function ShopHeader() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-0 -z-10 h-[220px] w-[420px] rounded-full bg-primary/[0.04] blur-[120px]"
      />

      <Container className="pb-2 pt-24 sm:pb-3 sm:pt-26 lg:pb-4 lg:pt-28">
        <div className="sr-only">Browse the Forma 3D model collection.</div>
      </Container>
    </section>
  );
}
