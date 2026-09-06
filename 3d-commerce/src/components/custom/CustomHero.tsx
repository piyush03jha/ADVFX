"use client";

import Link from "next/link";

interface CustomHeroProps {
  body: string;
  head: string;
}

const examples = [
  { label: "Half body", image: "/catogeries/1.jpg", active: (body: string) => body === "half" },
  { label: "Bobble head", image: "/catogeries/3.jpg", active: (head: string) => head === "bobble" },
  { label: "Full body", image: "/catogeries/2.jpg", active: (body: string) => body === "full" },
  { label: "Stationary head", image: "/catogeries/4.jpg", active: (head: string) => head === "stationary" },
];

export function CustomHero({ body, head }: CustomHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 pt-2 text-xs text-muted">
        <Link href="/" className="transition hover:text-foreground">Home</Link>
        <span>/</span>
        <span className="text-foreground">Custom</span>
      </div>

      <div className="grid gap-6 pt-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch lg:gap-8 lg:pt-8">
        <div className="flex min-h-[360px] flex-col justify-center rounded-[30px] border border-border bg-surface/45 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:min-h-[430px] sm:p-8 lg:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--glow-primary)]" />
            Custom Studio
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
            Make a figure
            <br />
            <span className="text-primary">that feels yours.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
            Pick the essentials, see what your finished piece can look like, upload your references and get a fixed price instantly.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge text="6 quick choices" />
            <Badge text="Fixed price" />
            <Badge text="Physical product" />
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-border bg-surface/55 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:min-h-[430px] sm:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(139,92,246,0.18),transparent_38%)]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="relative flex h-full min-h-[334px] flex-col sm:min-h-[398px]">
            <div className="flex items-center justify-between px-2 pt-1 sm:px-3">
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted backdrop-blur">See the difference</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Live examples</span>
            </div>
            <div className="grid flex-1 grid-cols-4 items-center gap-2 px-2 pb-2 pt-5 sm:gap-4 sm:px-3">
              {examples.map((example) => {
                const selected = example.active(body) || example.active(head);
                return (
                  <div key={example.label} className={`min-w-0 transition duration-300 ${selected ? "scale-[1.035]" : "opacity-55"}`}>
                    <div className={`relative overflow-hidden rounded-[22px] border bg-black/20 ${selected ? "border-primary/55 shadow-[0_18px_45px_rgba(139,92,246,0.14)]" : "border-white/10"}`}>
                      <div className="aspect-[4/5]">
                        <img src={example.image} alt={example.label} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:text-[10px]">{example.label}</p>
                      </div>
                      {selected && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--glow-primary)]" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-2 pb-2 sm:px-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-[10px] leading-5 text-muted backdrop-blur">
                Your selections highlight the closest reference. Your actual piece is created from the photos or 3D model you upload.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted">{text}</span>;
}
