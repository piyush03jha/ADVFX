import { Navbar } from "@/components/layout/SiteNavbar";
import { Container } from "@/components/ui/Container";

/**
 * Shown immediately while a product page renders, so clicking a suggested product
 * gives instant feedback instead of the old page freezing in place.
 */
export default function ProductLoading() {
  return (
    <>
      <Navbar />
      <main className="w-full overflow-hidden" aria-busy="true" aria-live="polite">
        <div className="pt-28 lg:pt-32">
          <Container>
            <div className="h-3 w-48 animate-pulse rounded-full bg-foreground/10" />

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-10">
              <div>
                <div className="aspect-[4/3] w-full animate-pulse rounded-[22px] border border-border bg-foreground/[0.06] sm:rounded-[28px]" />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-[4/3] animate-pulse rounded-xl border border-border bg-foreground/[0.05]"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-3 w-24 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-9 w-4/5 animate-pulse rounded-xl bg-foreground/10" />
                <div className="h-5 w-32 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-8 w-40 animate-pulse rounded-xl bg-foreground/10" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full animate-pulse rounded-full bg-foreground/[0.07]" />
                  <div className="h-3 w-11/12 animate-pulse rounded-full bg-foreground/[0.07]" />
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-foreground/[0.07]" />
                </div>
                <div className="h-12 w-full animate-pulse rounded-2xl bg-primary/20" />
              </div>
            </div>
          </Container>
        </div>
        <span className="sr-only">Loading product</span>
      </main>
    </>
  );
}
