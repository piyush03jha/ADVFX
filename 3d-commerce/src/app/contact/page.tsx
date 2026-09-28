import Link from "next/link";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconMail,
  IconMessageCircle,
  IconPackage,
} from "@tabler/icons-react";

const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "/contact";
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@advfx.in";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-28 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Contact us
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Let&apos;s build something worth displaying.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Have a custom 3D product in mind, need help with an order, or want to discuss a project? Our team is here to help.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <a
            href={`mailto:${contactEmail}`}
            className="group rounded-3xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconMail size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Email our team</h2>
            <p className="mt-2 text-sm leading-6 text-muted">For custom requests, product questions, and order assistance.</p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {contactEmail} <IconArrowRight size={16} />
            </span>
          </a>

          <div className="rounded-3xl border border-border bg-surface p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconMessageCircle size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Custom product?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Share your reference images, dimensions, and requirements through our custom product workflow.</p>
            <Link href="/custom" className="mt-7 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground">
              Start a custom request <IconArrowRight size={16} />
            </Link>
          </div>
        </div>

        <section className="mt-4 rounded-3xl border border-border bg-surface p-7 sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Bulk orders</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Need multiple pieces?</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Tell us the product, quantity, sizes, and deadline. We&apos;ll help plan production and delivery for your event, team, business, or campaign.
              </p>
            </div>
            <Link href="/contact?subject=Bulk%20Order" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-xs font-semibold text-background transition hover:opacity-90">
              Discuss bulk order <IconPackage size={15} />
            </Link>
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <a
            href={whatsappUrl}
            target={whatsappUrl.startsWith("http") ? "_blank" : undefined}
            rel={whatsappUrl.startsWith("http") ? "noreferrer" : undefined}
            className="group rounded-3xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconBrandWhatsapp size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Chat on WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-muted">For quick questions about custom work, bulk orders, sizes, and production.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              Start a WhatsApp chat <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </a>

          <div className="rounded-3xl border border-border bg-surface p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconMessageCircle size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Not sure what to ask?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Just send the product or idea you have in mind. We can guide you through the next step.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
