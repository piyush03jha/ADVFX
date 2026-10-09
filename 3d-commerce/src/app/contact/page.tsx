import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconCheck,
  IconMail,
  IconMessageCircle,
  IconPackage,
  IconSparkles,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Contact Voxel3D",
  description: "Questions about an order, a custom 3D print or a bulk request? Reach the Voxel3D team by WhatsApp or email.",
  alternates: { canonical: "/contact" },
};

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function createWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function getContactEmail() {
  try {
    const api = process.env.BACKEND_API_URL || "http://localhost:4000";
    const response = await fetch(api + "/site-content/contactEmail", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (typeof data?.value === "string" && data.value.trim()) return data.value.trim();
    }
  } catch {}
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@voxel3d.org";
}

export default async function ContactPage() {
  const contactEmail = await getContactEmail();
  const whatsappUrl = createWhatsAppUrl(
    "Hi Voxel3D team, I would like to discuss a bulk order."
  );
  const customWhatsappUrl = createWhatsAppUrl(
    "Hi Voxel3D team, I have a question about custom 3D products."
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />

      <main className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] overflow-hidden"
        >
          <div className="absolute left-1/2 top-0 h-[420px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--primary)_7%,transparent),transparent_52%)]" />
        </div>

        <section className="relative px-5 pb-14 pt-28 sm:px-8 sm:pb-20 sm:pt-36 lg:px-12 lg:pb-24 lg:pt-40">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--glow-primary)]" />
                  Contact Voxel3D
                </div>

                <h1 className="mt-6 max-w-4xl font-serif text-[2.75rem] leading-[0.94] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[5.5rem]">
                  Let&apos;s make your
                  <span className="block text-muted">idea tangible.</span>
                </h1>

                <p className="mt-6 max-w-2xl text-sm leading-6 text-muted sm:mt-7 sm:text-base sm:leading-7">
                  Have a custom 3D product in mind, need help with an order, or want to discuss a project?
                  Tell us what you&apos;re building and we&apos;ll help you find the right next step.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-7">
                <div
                  aria-hidden="true"
                  className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.12] blur-3xl"
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary">
                      <IconSparkles size={20} stroke={1.6} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">What can we help with?</p>
                      <p className="mt-0.5 text-xs text-muted">Choose the fastest route.</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      "Custom 3D product",
                      "Existing order or delivery",
                      "Bulk / business order",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-sm text-muted">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <IconCheck size={12} stroke={2.2} />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href={`mailto:${contactEmail}`}
                className="group rounded-3xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                  <IconMail size={20} stroke={1.7} />
                </div>
                <h2 className="mt-6 text-lg font-semibold">Email our team</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  For custom requests, product questions, and order assistance.
                </p>
                <span className="mt-6 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-foreground">
                  {contactEmail}
                  <IconArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </span>
              </a>

              <Link
                href="/custom"
                className="group rounded-3xl border border-primary/25 bg-primary/[0.06] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/[0.09] sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_24px_var(--glow-primary)]">
                  <IconMessageCircle size={20} stroke={1.7} />
                </div>
                <h2 className="mt-6 text-lg font-semibold">Start a custom request</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Share your reference images, dimensions, and requirements with our team.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  Start building
                  <IconArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <a
                href={customWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-3xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                  <IconBrandWhatsapp size={20} stroke={1.7} />
                </div>
                <h2 className="mt-6 text-lg font-semibold">Chat on WhatsApp</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  For quick questions about custom work, bulk orders, sizes, and production.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  Start a chat
                  <IconArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </div>

            <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="grid lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="p-6 sm:p-8 lg:p-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Bulk orders
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Need multiple pieces?
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                    Tell us the product, quantity, sizes, and deadline. We&apos;ll help plan production and delivery
                    for your event, team, business, or campaign.
                  </p>
                </div>

                <div className="border-t border-border p-6 lg:border-l lg:border-t-0 lg:p-8">
                  <Button href={whatsappUrl} variant="primary" size="md" className="w-full sm:w-auto">
                    Discuss bulk order
                    <IconBrandWhatsapp size={15} />
                  </Button>
                </div>
              </div>
            </section>

            <div className="mt-10 text-center">
              <p className="text-xs text-muted">
                Not sure where to start?
                <Link href="/custom" className="ml-1.5 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary">
                  Send us your idea
                </Link>
                {" "}and we&apos;ll guide you.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
