import Link from "next/link";
import { IconArrowRight, IconMail, IconMessageCircle } from "@tabler/icons-react";

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
            Have a custom 3D product in mind, need help with an order, or want to
            discuss a project? Our team is here to help.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <a
            href="mailto:contact@advfx.in"
            className="group rounded-3xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconMail size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Email our team</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              For custom requests, product questions, and order assistance.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              contact@advfx.in
              <IconArrowRight
                size={16}
                stroke={1.8}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </a>

          <div className="rounded-3xl border border-border bg-surface p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
              <IconMessageCircle size={20} stroke={1.7} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Custom product?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Share your reference images, dimensions, and requirements through
              our custom product workflow.
            </p>
            <Link
              href="/custom"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              Start a custom request
              <IconArrowRight size={16} stroke={1.8} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
