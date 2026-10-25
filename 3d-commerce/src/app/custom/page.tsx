"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconPackage,
  IconMessageCircle,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { CustomForm, type CustomSubmission } from "@/components/custom/CustomForm";
import { CustomSuccessState } from "@/components/custom/CustomSuccessState";
import { Reviews } from "@/components/home/Reviews";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";

const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "/contact";

export default function CustomPage() {
  const [body, setBody] = useState("full");
  const [head, setHead] = useState("bobble");
  const [submission, setSubmission] = useState<CustomSubmission | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        "@id": absoluteUrl("/custom#how-to"),
        name: "How to request a custom 3D printed model from Voxel3D",
        description: "Submit reference photos and requirements so the Voxel3D team can review a custom physical model request.",
        inLanguage: "en-IN",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Share reference photos and requirements",
            text: "Upload clear JPG or PNG photos and provide the requested size, style, and important details.",
            url: absoluteUrl("/custom#custom-request"),
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Team reviews and prepares the model",
            text: "The Voxel3D team reviews the idea, prepares the 3D model, and plans physical production.",
            url: absoluteUrl("/custom#how-we-work"),
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Confirm the build and arrange delivery",
            text: "After the build is confirmed, the physical order is processed and delivery is arranged. Timing and availability depend on the specific request.",
            url: absoluteUrl("/custom#how-we-work"),
          },
        ],
      }} />
      <Navbar />

      <main id="main-content" className="relative isolate overflow-x-clip pt-20 sm:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-[radial-gradient(circle_at_72%_8%,rgb(from var(--primary) r g b / 0.10),transparent_34%),radial-gradient(circle_at_18%_18%,rgb(from var(--foreground) r g b / 0.035),transparent_28%)]" />

        {submission ? (
          <>
            <CustomSuccessState {...submission} />
            <CustomPageSupport />
          </>
        ) : (
          <>
            <section id="custom-request" className="mx-auto max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-10">
              <div className="mx-auto max-w-4xl py-6 text-center sm:py-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Custom studio</p>
                <h1 className="mt-3 font-serif text-[2rem] leading-[1.05] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                  Made for you, not from a template.
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                  Made for you, not from a template: send us your photos and requirements and we’ll review the idea, prepare the 3D model, make the physical piece, and help arrange delivery.
                </p>
              </div>

              <CustomForm
                body={body}
                onBodyChange={setBody}
                head={head}
                onHeadChange={setHead}
                onSubmit={setSubmission}
              />
            </section>

            <section id="how-we-work" className="border-y border-border bg-surface/35">
              <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20 lg:px-8">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">How we work</p>
                  <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Simple from your side.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">You share the idea. We handle the technical work and keep you informed.</p>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  {[
                    ["01", "Share", "Upload clear photos and tell us the size, style, and any important details."],
                    ["02", "We create", "Our team prepares the 3D model and plans the physical production."],
                    ["03", "We deliver", "After the build is confirmed, we process the physical order and arrange delivery."],
                  ].map(([number, title, text]) => (
                    <div key={number} className="rounded-2xl border border-border bg-background/55 p-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[11px] font-semibold text-primary">{number}</div>
                      <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Reviews />

            <CustomPageSupport />
          </>
        )}
      </main>
    </div>
  );
}

function CustomPageSupport() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Not sure what to choose?</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Confused about the right option?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Don&apos;t worry. Send us your idea and photos and our team will guide you on the suitable size, format, and next steps.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button href="/contact" variant="primary" size="md">
                Contact us <IconArrowRight size={15} />
              </Button>
              <a href={whatsappUrl} target={whatsappUrl.startsWith("http") ? "_blank" : undefined} rel={whatsappUrl.startsWith("http") ? "noreferrer" : undefined} className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-5 text-xs font-semibold transition hover:border-primary hover:text-primary">
                <IconBrandWhatsapp size={16} /> WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-7 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Bulk orders</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.04em]">Ordering for a team, event, or business?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Tell us the product, quantity, preferred sizes, and deadline. We&apos;ll take the conversation from there.
            </p>
            <Link href="/contact?subject=Bulk%20Order" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 text-xs font-semibold text-primary transition hover:bg-primary/15">
              Discuss a bulk order <IconPackage size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <IconMessageCircle size={20} className="mx-auto text-primary" />
          <p className="mt-3 text-sm font-medium">Need a quick answer?</p>
          <p className="mt-1 text-xs text-muted">Use contact or WhatsApp and our team can help before you submit a request.</p>
        </div>
      </section>
    </>
  );
}
