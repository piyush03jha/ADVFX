import Link from "next/link";
import { IconArrowLeft, IconHome, IconSearch } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[70vh] items-center py-24">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">404 · Page not found</p>
            <h1 className="mt-5 font-serif text-4xl tracking-[-0.05em] sm:text-6xl">This model is off the map.</h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted">
              The page may have moved, or the link may be incorrect. Explore the collection to find what you need.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-xs font-medium text-white transition hover:bg-primary-hover">
                <IconHome size={15} /> Home
              </Link>
              <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-xs font-medium transition hover:border-primary/50">
                <IconSearch size={15} /> Browse shop
              </Link>
            </div>
            <Link href="/" className="mt-7 inline-flex items-center gap-2 text-[11px] text-muted transition hover:text-foreground">
              <IconArrowLeft size={13} /> Return to Voxel3D
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
