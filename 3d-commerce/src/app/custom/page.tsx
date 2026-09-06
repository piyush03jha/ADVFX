"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCloudUpload,
  IconHeart,
  IconInfoCircle,
  IconSparkles,
  IconUser,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { Navbar } from "@/components/layout/SiteNavbar";

const bodyOptions = [
  { id: "half", label: "Half body", description: "Waist-up or seated composition.", basePrice: 2499, image: "/catogeries/1.jpg" },
  { id: "full", label: "Full body", description: "Complete figure from head to feet.", basePrice: 3499, image: "/catogeries/2.jpg" },
];
const headOptions = [
  { id: "bobble", label: "Bobble head", description: "Oversized head with a playful collectible feel.", addPrice: 500, icon: IconSparkles, image: "/catogeries/3.jpg" },
  { id: "stationary", label: "Stationary head", description: "Classic sculpted head with natural proportions.", addPrice: 0, icon: IconUser, image: "/catogeries/4.jpg" },
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
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_78%_8%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.05),transparent_28%)]" />
        {submitted ? <SuccessState price={price} body={selectedBody.label} head={selectedHead.label} size={selectedSize.label} frame={selectedFrame.label} /> : (
          <>
            <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 text-xs text-muted"><Link href="/" className="hover:text-foreground">Home</Link><span>/</span><span className="text-foreground">Custom</span></div>
              <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(520px,1.2fr)] lg:items-stretch lg:pt-10">
                <div className="flex flex-col justify-center rounded-[32px] border border-border bg-surface/45 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8 lg:p-10">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--glow-primary)]" /> Custom Studio</span>
                  <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Make something<br /><span className="text-primary">that feels yours.</span></h1>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Pick the essentials, look at the examples, upload your references and see the fixed price update instantly.</p>
                  <div className="mt-8 grid grid-cols-3 gap-2"><Stat label="6" value="quick choices" /><Stat label="₹" value="fixed price" /><Stat label="100%" value="physical" /></div>
                </div>
                <ExamplePanel body={body} head={head} />
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
              <form onSubmit={submit} className="overflow-hidden rounded-[32px] border border-border bg-surface/55 shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <div className="border-b border-border bg-background/30 px-5 py-5 sm:px-8 sm:py-6"><div className="flex items-center justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Customize</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Choose what matters.</h2></div><div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] text-muted">Starting at</p><p className="mt-1 text-2xl font-semibold sm:text-3xl">₹{price.toLocaleString("en-IN")}</p></div></div></div>

                <div className="grid lg:grid-cols-2">
                  <div className="border-b border-border p-5 sm:p-8 lg:border-r lg:border-b-0"><VisualChoice title="1. Body" helper="Half body is lighter. Full body shows the complete figure." options={bodyOptions} value={body} onChange={setBody} /></div>
                  <div className="border-b border-border p-5 sm:p-8 lg:border-b-0"><VisualChoice title="2. Head" helper="Choose a playful bobble or natural stationary head." options={headOptions} value={head} onChange={setHead} /></div>
                </div>

                <div className="border-t border-border p-5 sm:p-8">
                  <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-center">
                    <div><label htmlFor="size" className="text-sm font-medium">3. Size</label><p className="mt-1 text-xs leading-5 text-muted">Choose the final display height.</p><div className="relative mt-4"><select id="size" value={size} onChange={(e) => setSize(e.target.value)} className="h-14 w-full appearance-none rounded-2xl border border-border bg-background/60 px-4 pr-11 text-sm font-medium outline-none focus:border-primary/60">{sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><IconChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={18} /></div></div>
                    <ChoiceGrid title="4. Who is in the frame?" helper="More people or a pet changes the fixed price." options={frameOptions} value={frame} onChange={setFrame} />
                  </div>
                </div>

                <div className="border-t border-border p-5 sm:p-8">
                  <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
                    <div>
                      <p className="text-sm font-medium">5. Upload your references</p>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Upload photos or an existing 3D model. For the best likeness, include front, back, left and right views.</p>
                      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,.glb,.gltf,.obj,.stl,.fbx" className="sr-only" onChange={handleFiles} />
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <UploadCard title="Photos" text="Front · back · sides" onClick={() => fileInputRef.current?.click()} icon={<IconCloudUpload size={20} />} />
                        <UploadCard title="3D model" text="GLB · GLTF · OBJ · STL" onClick={() => fileInputRef.current?.click()} icon={<IconSparkles size={20} />} />
                      </div>
                      {fileError && <p className="mt-2 text-xs text-error">{fileError}</p>}
                      {files.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5"><span className="min-w-0 truncate text-xs text-muted">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-elevated"><IconX size={14} /></button></div>)}</div>}
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-5 sm:p-6"><div className="flex items-start gap-3"><IconInfoCircle size={18} className="mt-0.5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Good references make a better model.</p><p className="mt-2 text-xs leading-6 text-muted">Front, back and side views help our team understand proportions, clothing and details. Clear full-body photos work best.</p></div></div><div className="mt-5 grid grid-cols-4 gap-2 text-center text-[10px] uppercase tracking-[0.12em] text-muted"><span className="rounded-xl border border-border bg-background/35 px-2 py-3">Front</span><span className="rounded-xl border border-border bg-background/35 px-2 py-3">Back</span><span className="rounded-xl border border-border bg-background/35 px-2 py-3">Left</span><span className="rounded-xl border border-border bg-background/35 px-2 py-3">Right</span></div></div>
                  </div>
                </div>

                <div className="border-t border-border p-5 sm:p-8">
                  <label htmlFor="details" className="text-sm font-medium">6. Anything else?</label>
                  <p className="mt-1 text-xs leading-5 text-muted">Optional. Add the details you don't want us to miss.</p>
                  <textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={5} placeholder="Example: Keep the smile from the front photo, use the blue jacket, and place my dog beside me." className="mt-4 w-full resize-none rounded-2xl border border-border bg-background/45 p-4 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary/60" /><div className="mt-2 text-right text-[10px] text-muted">{details.length}/1000</div>
                </div>

                <div className="border-t border-border bg-background/35 p-5 sm:p-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Your build</span><span className="text-xs text-muted">{selectedBody.label} · {selectedHead.label} · {selectedSize.label} · {selectedFrame.label}</span></div><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">₹{price.toLocaleString("en-IN")}</p><p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-muted"><IconInfoCircle size={15} className="mt-0.5 shrink-0 text-primary" />Fixed price from your selections. No budget form.</p></div>
                    <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-semibold text-white shadow-[0_18px_50px_var(--glow-primary)] transition hover:bg-primary-hover lg:w-auto">Request this build <IconArrowRight size={17} /></button>
                  </div>
                </div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-background/45 px-3 py-3"><p className="text-lg font-semibold">{label}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">{value}</p></div>; }

function VisualChoice<T extends { id: string; label: string; description: string; image?: string; icon?: React.ComponentType<{ size?: number; stroke?: number }> }>({ title, helper, options, value, onChange }: { title: string; helper: string; options: T[]; value: string; onChange: (value: string) => void }) {
  return <div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{helper}</p><div className="mt-4 grid grid-cols-2 gap-3">{options.map((option) => { const selected = value === option.id; const Icon = option.icon ?? IconUser; return <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`group overflow-hidden rounded-[22px] border text-left transition ${selected ? "border-primary/70 bg-primary/[0.07] shadow-[0_18px_45px_rgba(139,92,246,0.09)]" : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-white/15"}`}><div className="relative h-36 overflow-hidden bg-black/20 sm:h-44">{option.image ? <img src={option.image} alt="" className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.2),transparent_55%)]"><Icon size={44} stroke={1.1} className="text-primary" /></div>}<div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/10 to-transparent" /><span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-white/20 bg-black/30 text-transparent"}`}><IconCheck size={13} /></span></div><div className="p-4"><p className="text-sm font-medium">{option.label}</p><p className="mt-1 text-xs leading-5 text-muted">{option.description}</p></div></button>; })}</div></div>;
}

function ChoiceGrid<T extends { id: string; label: string; description: string; icon?: React.ComponentType<{ size?: number; stroke?: number }> }>({ title, helper, options, value, onChange }: { title: string; helper: string; options: T[]; value: string; onChange: (value: string) => void }) {
  return <div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{helper}</p><div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{options.map((option) => { const selected = value === option.id; const Icon = option.icon ?? IconUser; return <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`min-h-[124px] rounded-2xl border p-4 text-left transition ${selected ? "border-primary/65 bg-primary/[0.075]" : "border-border bg-background/40 hover:border-white/15"}`}><div className="flex items-start justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-primary"><Icon size={17} /></span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><IconCheck size={12} /></span></div><p className="mt-3 text-sm font-medium">{option.label}</p><p className="mt-1 text-[11px] leading-4 text-muted">{option.description}</p></button>; })}</div></div>;
}

function UploadCard({ title, text, icon, onClick }: { title: string; text: string; icon: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="min-h-32 rounded-2xl border border-dashed border-white/15 bg-background/45 p-5 text-left transition hover:border-primary/60 hover:bg-primary/[0.035]"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-primary">{icon}</div><p className="mt-4 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{text}</p></button>; }

function ExamplePanel({ body, head }: { body: string; head: string }) { const bodyIndex = body === "half" ? 0 : 2; const headIndex = head === "bobble" ? 1 : 0; return <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-surface/60 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-4"><div className="relative min-h-[380px] overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(155deg,#171717,#090909)] p-4 sm:min-h-[470px] sm:p-5"><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" /><div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">see the difference</div><div className="relative flex min-h-[330px] items-center justify-center gap-2 sm:min-h-[420px] sm:gap-5"><ExampleFigure label="Half body" compact={bodyIndex === 0} image="/catogeries/1.jpg" /><ExampleFigure label="Bobble" compact={headIndex === 1} image="/catogeries/3.jpg" /><ExampleFigure label="Full body" compact={bodyIndex === 2} image="/catogeries/2.jpg" /><ExampleFigure label="Stationary" compact={headIndex === 0} image="/catogeries/4.jpg" /></div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] text-muted backdrop-blur">example products · your references become the brief</div></div></div>; }

function ExampleFigure({ label, compact, image }: { label: string; compact: boolean; image: string }) { return <div className={`w-[23%] min-w-0 transition ${compact ? "scale-105" : "opacity-55"}`}><div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-white/10 bg-black/20"><img src={image} alt="" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent" /><span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.13em] text-white/80">{label}</span></div></div>; }

function SuccessState({ price, body, head, size, frame }: { price: number; body: string; head: string; size: string; frame: string }) { return <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center px-4 py-16 sm:px-6 lg:px-8"><div className="w-full rounded-[32px] border border-border bg-surface/60 p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-12"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-primary/30 bg-primary/10 text-primary"><IconCheck size={36} /></div><p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Request received</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Your custom piece is ready for review.</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">We captured your selections and references. Our team can now check the files and move the build toward production.</p><div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-4">{[["Body", body], ["Head", head], ["Size", size], ["Fixed price", `₹${price.toLocaleString("en-IN")}`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-background/45 p-4 text-left"><p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></div>)}</div><p className="mt-4 text-xs text-muted">Frame: {frame}</p><div className="mt-8"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-xs font-semibold text-background">Back to home <IconArrowRight size={15} /></Link></div></div></section>; }
