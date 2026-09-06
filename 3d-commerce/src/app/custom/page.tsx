"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconChevronDown, IconCloudUpload, IconHeart, IconInfoCircle, IconSparkles, IconUser, IconUsers, IconX } from "@tabler/icons-react";
import { Navbar } from "@/components/layout/SiteNavbar";

const bodyOptions = [
  { id: "half", label: "Half body", description: "Waist-up or seated composition.", basePrice: 2499 },
  { id: "full", label: "Full body", description: "Complete figure from head to feet.", basePrice: 3499 },
];
const headOptions = [
  { id: "bobble", label: "Bobble head", description: "Oversized head with a playful collectible feel.", addPrice: 500, icon: IconSparkles },
  { id: "stationary", label: "Stationary head", description: "Classic sculpted head with natural proportions.", addPrice: 0, icon: IconUser },
];
const frameOptions = [
  { id: "single", label: "Just me", description: "One person as the main subject.", addPrice: 0, icon: IconUser },
  { id: "couple", label: "Me + partner", description: "Two people together in one display.", addPrice: 1800, icon: IconUsers },
  { id: "pet", label: "Me + pet", description: "Add a beloved pet to the piece.", addPrice: 1200, icon: IconHeart },
  { id: "group", label: "Family / group", description: "Three or more people in one scene.", addPrice: 3200, icon: IconUsers },
];
const sizeOptions = [
  { value: "8", label: "8 cm", multiplier: 0.75 },
  { value: "12", label: "12 cm", multiplier: 0.9 },
  { value: "15", label: "15 cm", multiplier: 1 },
  { value: "20", label: "20 cm", multiplier: 1.35 },
  { value: "25", label: "25 cm", multiplier: 1.75 },
  { value: "30", label: "30 cm", multiplier: 2.15 },
];

export default function CustomPage() {
  const [body, setBody] = useState("full");
  const [head, setHead] = useState("stationary");
  const [size, setSize] = useState("15");
  const [frame, setFrame] = useState("single");
  const [files, setFiles] = useState<File[]>([]);
  const [details, setDetails] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBody = bodyOptions.find((o) => o.id === body) ?? bodyOptions[1];
  const selectedHead = headOptions.find((o) => o.id === head) ?? headOptions[1];
  const selectedSize = sizeOptions.find((o) => o.value === size) ?? sizeOptions[2];
  const selectedFrame = frameOptions.find((o) => o.id === frame) ?? frameOptions[0];
  const price = useMemo(() => Math.round((selectedBody.basePrice + selectedHead.addPrice + selectedFrame.addPrice) * selectedSize.multiplier), [selectedBody, selectedHead, selectedFrame, selectedSize]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    const accepted = incoming.filter((file) => file.type === "image/jpeg" || file.type === "image/png" || /\.(glb|gltf|obj|stl|fbx)$/i.test(file.name));
    setFileError(accepted.length !== incoming.length ? "Only JPG, PNG, GLB, GLTF, OBJ, STL and FBX files are accepted." : "");
    setFiles((current) => [...current, ...accepted].slice(0, 10));
    event.target.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="relative isolate overflow-hidden pt-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_75%_8%,rgba(139,92,246,0.2),transparent_35%),radial-gradient(circle_at_8%_18%,rgba(255,255,255,0.05),transparent_28%)]" />
        {submitted ? <SuccessState price={price} body={selectedBody.label} head={selectedHead.label} size={selectedSize.label} frame={selectedFrame.label} /> : (
          <>
            <section className="mx-auto max-w-7xl px-4 pb-9 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 text-xs text-muted"><Link href="/" className="hover:text-foreground">Home</Link><span>/</span><span className="text-foreground">Custom</span></div>
              <div className="grid gap-10 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pt-12">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--glow-primary)]" /> Custom Studio</span>
                  <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-7xl">Make a figure<br /><span className="text-primary">that looks like you.</span></h1>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Choose the essentials, see example forms, upload your references and get a fixed price instantly. No long questionnaire.</p>
                  <div className="mt-7 flex flex-wrap gap-2"><span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted">6 quick choices</span><span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted">Fixed price</span><span className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted">Physical product</span></div>
                </div>
                <ExamplePanel />
              </div>
            </section>

            <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
              <form onSubmit={submit} className="overflow-hidden rounded-[32px] border border-border bg-surface/55 shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <div className="border-b border-border bg-background/25 px-5 py-5 sm:px-8 sm:py-6"><div className="flex items-end justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Build in seconds</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Choose the essentials.</h2></div><div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] text-muted">Current price</p><p className="mt-1 text-2xl font-semibold">₹{price.toLocaleString("en-IN")}</p></div></div></div>
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="p-5 sm:p-8 md:border-r md:border-border"><ChoiceSection title="1. Half or full body?" helper="Your choice changes the base price." options={bodyOptions} value={body} onChange={setBody} /></div>
                  <div className="border-t border-border p-5 sm:p-8 md:border-t-0"><ChoiceSection title="2. Bobble head or stationary?" helper="Pick the head style you want." options={headOptions} value={head} onChange={setHead} /></div>
                </div>
                <div className="border-t border-border p-5 sm:p-8"><div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start"><div><label htmlFor="size" className="text-sm font-medium">3. Pick a size</label><p className="mt-1 text-xs leading-5 text-muted">The price updates instantly.</p><div className="relative mt-4"><select id="size" value={size} onChange={(e) => setSize(e.target.value)} className="h-14 w-full appearance-none rounded-2xl border border-border bg-background/60 px-4 pr-11 text-sm font-medium outline-none focus:border-primary/60">{sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><IconChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={18} /></div></div><ChoiceSection title="4. Who is in the frame?" helper="Adding people or a pet changes the fixed price." options={frameOptions} value={frame} onChange={setFrame} compact /></div></div>
                <div className="border-t border-border p-5 sm:p-8"><div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]"><div><p className="text-sm font-medium">5. Show us the reference</p><p className="mt-1 text-xs leading-5 text-muted">Upload the photos or 3D model you already have. For best likeness, add front, back and side views when possible.</p><input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,.glb,.gltf,.obj,.stl,.fbx" className="sr-only" onChange={handleFiles} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><UploadCard title="Upload photos" text="Front · back · left · right" onClick={() => fileInputRef.current?.click()} icon={<IconCloudUpload size={21} />} /><UploadCard title="I have a 3D model" text="Send the model you already own" onClick={() => fileInputRef.current?.click()} icon={<IconSparkles size={20} />} /></div>{fileError && <p className="mt-2 text-xs text-error">{fileError}</p>}{files.length > 0 && <div className="mt-4 space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5"><span className="min-w-0 truncate text-xs text-muted">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-elevated"><IconX size={14} /></button></div>)}</div>}</div><div><label htmlFor="details" className="text-sm font-medium">6. Anything specific?</label><p className="mt-1 text-xs leading-5 text-muted">Optional. Tell us any detail you want us to notice.</p><textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={9} placeholder="Example: Keep the smile from the front photo, use the blue jacket, and add my dog sitting beside me." className="mt-4 w-full resize-none rounded-2xl border border-border bg-background/45 p-4 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary/60" /><div className="mt-2 text-right text-[10px] text-muted">{details.length}/1000</div></div></div></div>
                <div className="border-t border-border bg-background/35 p-5 sm:p-8"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Your build</span><span className="text-xs text-muted">{selectedBody.label} · {selectedHead.label} · {selectedSize.label} · {selectedFrame.label}</span></div><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">₹{price.toLocaleString("en-IN")}</p><p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-muted"><IconInfoCircle size={15} className="mt-0.5 shrink-0 text-primary" />Fixed price based on your selections. We review the references before production.</p></div><button type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-semibold text-white shadow-[0_18px_50px_var(--glow-primary)] transition hover:bg-primary-hover lg:w-auto">Request this build <IconArrowRight size={17} /></button></div></div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ChoiceSection<T extends { id: string; label: string; description: string; icon?: React.ComponentType<{ size?: number; stroke?: number }> }>({ title, helper, options, value, onChange, compact = false }: { title: string; helper: string; options: T[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return <div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{helper}</p><div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : ""}`}>{options.map((option) => { const selected = value === option.id; const Icon = option.icon ?? IconUser; return <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`rounded-2xl border p-4 text-left transition duration-300 ${selected ? "border-primary/65 bg-primary/[0.075] shadow-[0_18px_45px_rgba(139,92,246,0.08)]" : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-white/15 hover:bg-background/60"}`}><div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary"><Icon size={18} stroke={1.7} /></div><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><IconCheck size={12} /></span></div><p className="mt-4 text-sm font-medium">{option.label}</p><p className="mt-1 text-xs leading-5 text-muted">{option.description}</p></button>; })}</div></div>;
}

function UploadCard({ title, text, icon, onClick }: { title: string; text: string; icon: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-32 items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-background/45 p-5 text-left transition hover:border-primary/60 hover:bg-primary/[0.035]"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary">{icon}</div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{text}</p></div></button>; }

function ExamplePanel() { return <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-surface/60 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-4"><div className="relative min-h-[330px] overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(155deg,#171717,#090909)] p-5 sm:min-h-[410px]"><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" /><div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">product examples</div><div className="relative flex min-h-[290px] items-end justify-center gap-4 pt-12 sm:min-h-[365px] sm:gap-7">{[["Half body", "h-40 w-24 rounded-[45%_45%_20%_20%]"], ["Bobble head", "h-44 w-28 rounded-[46%_46%_25%_25%]"], ["Full body", "h-52 w-24 rounded-[42%_42%_28%_28%]"]].map(([name, shape], index) => <div key={name} className="relative flex w-24 flex-col items-center sm:w-28"><div className="absolute bottom-10 h-32 w-24 rounded-full bg-primary/15 blur-3xl" /><div className={`relative border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.025] shadow-[0_30px_70px_rgba(0,0,0,0.35)] ${shape}`}><div className={`absolute left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.06] ${index === 1 ? "top-4 h-16 w-16" : "top-7 h-12 w-12"}`} /></div><p className="mt-4 whitespace-nowrap text-[10px] uppercase tracking-[0.15em] text-muted">{name}</p></div>)}</div><div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] text-muted backdrop-blur">reference examples · your model comes from your files</div></div></div>; }

function SuccessState({ price, body, head, size, frame }: { price: number; body: string; head: string; size: string; frame: string }) { return <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center px-4 py-16 sm:px-6 lg:px-8"><div className="w-full rounded-[32px] border border-border bg-surface/60 p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-12"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-primary/30 bg-primary/10 text-primary"><IconCheck size={36} /></div><p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Request received</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Your custom piece is ready for review.</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">We captured your selections and references. Our team can now check the files and move the build toward production.</p><div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-4">{[["Body", body], ["Head", head], ["Size", size], ["Fixed price", `₹${price.toLocaleString("en-IN")}`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-background/45 p-4 text-left"><p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></div>)}</div><p className="mt-4 text-xs text-muted">Frame: {frame}</p><div className="mt-8"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-xs font-semibold text-background">Back to home <IconArrowRight size={15} /></Link></div></div></section>; }
