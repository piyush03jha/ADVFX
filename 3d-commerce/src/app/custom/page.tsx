"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCloudUpload,
  IconCube,
  IconDiamond,
  IconHeart,
  IconInfoCircle,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { CustomStudioPreview } from "@/components/custom/CustomStudioPreview";

const steps = [
  "Create",
  "References",
  "Style",
  "Pose",
  "Outfit",
  "Accessories",
  "Base",
  "Size",
  "Finish",
  "Dimensions",
  "Details",
  "Budget",
  "Review",
  "Request",
];

const creationTypes = [
  { title: "Custom Figurine", description: "A premium figure based on you, your family, or a special moment.", icon: IconDiamond },
  { title: "Custom Character", description: "Turn an idea, sketch, or photo into a collectible character.", icon: IconSparkles },
  { title: "Custom Pet", description: "Create a detailed keepsake of your favourite companion.", icon: IconHeart },
  { title: "Custom Couple", description: "Celebrate a wedding, anniversary, or shared memory.", icon: IconDiamond },
  { title: "Custom Product", description: "Bring a product concept, prop, or object to physical form.", icon: IconCube },
  { title: "I Have a 3D Model", description: "Send an existing model for preparation and manufacturing review.", icon: IconCube },
];

const styles = ["Realistic", "Anime", "Chibi", "Gaming", "Cartoon", "Low Poly", "Collectible", "Custom"];
const poses = ["Standing", "Hero", "Sitting", "Walking", "Running", "Action", "Holding something", "Custom"];
const outfits = ["Same as photo", "Formal", "Casual", "Wedding", "Sports", "Gaming", "Traditional", "Custom"];
const accessories = ["None", "Glasses", "Watch", "Hat", "Necklace", "Bag", "Camera", "Custom"];
const bases = ["No base", "Standard", "Premium", "Scene base", "Custom"];
const sizes = ["8 cm", "12 cm", "15 cm", "20 cm", "25 cm", "30 cm"];
const finishes = ["Single Color", "Full Color", "Hand Painted", "Matte", "Gloss"];
const budgets = ["₹2,000 – ₹5,000", "₹5,000 – ₹10,000", "₹10,000 – ₹20,000", "₹20,000+"];

export default function CustomPage() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState("Custom Figurine");
  const [files, setFiles] = useState<File[]>([]);
  const [style, setStyle] = useState("Realistic");
  const [pose, setPose] = useState("Standing");
  const [outfit, setOutfit] = useState("Same as photo");
  const [accessory, setAccessory] = useState("None");
  const [base, setBase] = useState("Standard");
  const [size, setSize] = useState("15 cm");
  const [finish, setFinish] = useState("Full Color");
  const [height, setHeight] = useState("15");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("₹5,000 – ₹10,000");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = ((step + 1) / steps.length) * 100;
  const activeType = creationTypes.find((item) => item.title === type) ?? creationTypes[0];
  const canGoBack = step > 0;
  const canGoNext = step < steps.length - 1;

  const summary = useMemo(
    () => [
      ["Creation", type],
      ["Style", style],
      ["Pose", pose],
      ["Outfit", outfit],
      ["Accessory", accessory],
      ["Base", base],
      ["Size", size],
      ["Finish", finish],
      ["Dimensions", `${height || "Auto"} × ${width || "Auto"} × ${depth || "Auto"} cm`],
      ["Budget", budget],
    ],
    [accessory, base, budget, depth, finish, height, outfit, pose, size, style, type, width],
  );

  function handleFiles(input: FileList | null) {
    if (!input) return;
    const accepted = Array.from(input).filter((file) => {
      const type = file.type.toLowerCase();
      return type === "image/jpeg" || type === "image/png" || /\.(glb|gltf|obj|stl|fbx)$/i.test(file.name);
    });
    setFiles((current) => [...current, ...accepted].slice(0, 10));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative isolate overflow-hidden pt-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[660px] bg-[radial-gradient(circle_at_76%_10%,rgba(139,92,246,0.2),transparent_34%),radial-gradient(circle_at_8%_22%,rgba(255,255,255,0.05),transparent_28%)]" />

        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="transition hover:text-foreground">Home</Link>
            <span>/</span>
            <span className="text-foreground">Custom Studio</span>
          </div>

          <div className="grid gap-8 pb-8 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end lg:pt-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium text-muted shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--glow-primary)]" />
                Custom 3D Studio
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-7xl">
                Your idea.<br />
                <span className="text-primary">Made physical.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Tell us what you want to create. Upload references, choose the look and dimensions, and our 3D team will turn your brief into a production-ready custom model.
              </p>
            </div>

            <div className="relative h-[255px] overflow-hidden rounded-[28px] border border-white/10 bg-surface/65 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:h-[300px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.2),transparent_38%)]" />
              <CustomStudioPreview />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted backdrop-blur">studio preview</div>
            </div>
          </div>

          <div className="sticky top-[76px] z-40 rounded-2xl border border-border bg-background/90 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:top-[84px] sm:p-4">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Step {step + 1} of {steps.length}</p><p className="mt-1 text-sm font-medium">{steps[step]}</p></div>
              <span className="text-xs text-muted">{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-elevated"><div className="h-full rounded-full bg-gradient-to-r from-primary-dark via-primary to-primary-hover transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 hidden gap-1.5 md:flex">{steps.map((item, index) => <button key={item} type="button" onClick={() => setStep(index)} className={`h-1 flex-1 rounded-full transition ${index <= step ? "bg-primary" : "bg-surface-elevated"}`} aria-label={`Go to ${item}`} />)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-[28px] border border-border bg-surface/55 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="min-h-[560px] p-5 sm:p-8">
                {submitted ? <SubmissionState /> : (
                  <>
                    {step === 0 && <StepShell eyebrow="01 · Start" title="What are you making?" description="Choose the kind of custom product you want our team to create."><div className="grid gap-3 sm:grid-cols-2">{creationTypes.map(({ title, description, icon: Icon }) => <OptionCard key={title} selected={type === title} onClick={() => setType(title)}><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-primary"><Icon size={21} stroke={1.7} /></div><div className="mt-4"><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div></OptionCard>)}</div></StepShell>}

                    {step === 1 && <StepShell eyebrow="02 · References" title="Show us what you want." description="Upload up to 10 JPG or PNG photos. Existing 3D files can also be attached for review."><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,.glb,.gltf,.obj,.stl,.fbx" multiple className="sr-only" onChange={(event) => handleFiles(event.target.files)} /><button type="button" onClick={() => fileInputRef.current?.click()} className="group flex min-h-[320px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-background/60 p-8 text-center transition hover:border-primary/60 hover:bg-primary/[0.035]"><span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-lg"><IconCloudUpload size={28} stroke={1.5} /></span><span className="mt-5 text-base font-medium">Drop photos here or browse</span><span className="mt-2 max-w-md text-xs leading-5 text-muted">Front, side, back, close-up details, outfit and pose references all help our team.</span><span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium"><IconUpload size={15} /> Add references</span></button>{files.length > 0 && <div className="mt-4 rounded-2xl border border-border bg-background/55 p-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">{files.length} reference{files.length > 1 ? "s" : ""} selected</span><button type="button" onClick={() => setFiles([])} className="text-xs text-muted hover:text-foreground">Clear</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="truncate rounded-xl border border-border px-3 py-2 text-xs text-muted">{file.name}</div>)}</div></div>}</StepShell>}

                    {step === 2 && <ChoiceStep eyebrow="03 · Style" title="Choose your visual direction." description="This is a creative reference for our 3D team." options={styles} value={style} onChange={setStyle} />}
                    {step === 3 && <ChoiceStep eyebrow="04 · Pose" title="How should it feel?" description="Start with a predefined pose or request a custom one." options={poses} value={pose} onChange={setPose} />}
                    {step === 4 && <ChoiceStep eyebrow="05 · Outfit" title="What should it wear?" description="Use the photo as-is or give us a different direction." options={outfits} value={outfit} onChange={setOutfit} />}
                    {step === 5 && <ChoiceStep eyebrow="06 · Accessories" title="Add the details." description="Accessories and props can make the final piece feel uniquely yours." options={accessories} value={accessory} onChange={setAccessory} />}
                    {step === 6 && <ChoiceStep eyebrow="07 · Base" title="Choose the presentation." description="A base can turn a figurine into a complete display piece." options={bases} value={base} onChange={setBase} />}
                    {step === 7 && <ChoiceStep eyebrow="08 · Size" title="How big should it be?" description="Larger pieces allow more detail and affect production cost." options={sizes} value={size} onChange={setSize} />}
                    {step === 8 && <ChoiceStep eyebrow="09 · Finish" title="Pick the final finish." description="We will recommend the most suitable production route after review." options={finishes} value={finish} onChange={setFinish} />}

                    {step === 9 && <StepShell eyebrow="10 · Dimensions" title="Set your target dimensions." description="Choose a height and let us solve the proportions, or provide all three dimensions."><div className="grid gap-4 sm:grid-cols-3">{[["Height", height, setHeight], ["Width", width, setWidth], ["Depth", depth, setDepth]].map(([label, value, setter]) => <label key={String(label)} className="rounded-2xl border border-border bg-background/50 p-4"><span className="text-xs text-muted">{label} (cm)</span><input value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} placeholder="Auto" inputMode="decimal" className="mt-3 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground" /></label>)}</div><div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 text-xs leading-5 text-muted"><IconInfoCircle size={16} className="mb-2 text-primary" />Not sure about proportions? Set only the height and our team will propose suitable dimensions.</div></StepShell>}

                    {step === 10 && <StepShell eyebrow="11 · Brief" title="Tell us the story behind it." description="Describe the important details our modelling and production team should know."><textarea value={requirements} maxLength={1000} onChange={(event) => setRequirements(event.target.value)} rows={10} placeholder="Example: I want a 15cm figure of me wearing the outfit in the second photo, with my dog beside me. Please keep the facial likeness and add the name “Piyush” to the base." className="w-full resize-none rounded-2xl border border-border bg-background/55 p-4 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary/50" /><div className="mt-4 flex items-center justify-between text-[11px] text-muted"><span>Be as specific as possible.</span><span>{requirements.length}/1000</span></div></StepShell>}

                    {step === 11 && <ChoiceStep eyebrow="12 · Budget" title="Set an expected budget." description="This helps us assess feasibility and propose the right production approach." options={budgets} value={budget} onChange={setBudget} />}

                    {step === 12 && <StepShell eyebrow="13 · Review" title="Review your custom brief." description="Everything here will be sent to the team with your request."><div className="space-y-2">{summary.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/45 px-4 py-3"><span className="text-xs text-muted">{label}</span><span className="text-right text-sm font-medium">{value}</span></div>)}</div><div className="mt-4 rounded-2xl border border-border bg-background/45 p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Your brief</p><p className="mt-2 text-sm leading-6 text-muted">{requirements || "No additional requirements added."}</p></div></StepShell>}

                    {step === 13 && <StepShell eyebrow="14 · Request" title="Ready to bring it to life?" description="Submit your brief. Our team will review feasibility, pricing and production details before asking you to pay."><div className="grid gap-3 sm:grid-cols-3">{[["01", "We review", "References, dimensions and feasibility"], ["02", "We quote", "Final price and production timeline"], ["03", "You approve", "Then we move into production"]].map(([n, title, body]) => <div key={n} className="rounded-2xl border border-border bg-background/45 p-4"><span className="text-[10px] font-semibold tracking-[0.18em] text-primary">{n}</span><p className="mt-4 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div>)}</div><button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_45px_var(--glow-primary)] transition hover:bg-primary-hover">Request My Custom Model <IconArrowRight size={17} /></button><p className="mt-3 text-center text-[11px] text-muted">No payment is taken at this stage.</p></StepShell>}
                  </>
                )}
              </div>

              {!submitted && <div className="flex items-center justify-between gap-3 border-t border-border p-4 sm:p-5"><button type="button" disabled={!canGoBack} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-medium text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"><IconArrowLeft size={15} /> Back</button><button type="button" disabled={!canGoNext} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">Continue <IconArrowRight size={15} /></button></div>}
            </div>

            <aside className="lg:sticky lg:top-[170px] lg:self-start"><div className="rounded-[28px] border border-border bg-surface/55 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Live brief</p><div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background/50 p-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-primary"><activeType.icon size={21} stroke={1.6} /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{type}</p><p className="mt-0.5 truncate text-xs text-muted">{style} · {size}</p></div></div><div className="mt-4 space-y-2">{["References", "Creative direction", "Dimensions", "Production brief"].map((label, index) => <div key={label} className="flex items-center justify-between rounded-xl border border-border/80 bg-background/35 px-3 py-2.5"><span className="text-xs text-muted">{label}</span><span className="text-xs font-medium">{[files.length ? `${files.length} added` : "Pending", style, `${height || "Auto"} cm`, requirements ? "Added" : "Pending"][index]}</span></div>)}</div><div className="mt-5 border-t border-border pt-4"><p className="text-xs leading-5 text-muted">Your request is a design brief, not an instant checkout. We confirm feasibility and final pricing before production.</p></div></div></aside>
          </form>
        </section>
      </main>
    </div>
  );
}

function StepShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p><div className="mt-7">{children}</div></div>;
}

function ChoiceStep({ eyebrow, title, description, options, value, onChange }: { eyebrow: string; title: string; description: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <StepShell eyebrow={eyebrow} title={title} description={description}><div className="grid gap-3 sm:grid-cols-2">{options.map((option) => <OptionCard key={option} selected={value === option} onClick={() => onChange(option)}><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{option}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${value === option ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><IconCheck size={14} /></span></div></OptionCard>)}</div></StepShell>;
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-[22px] border p-4 text-left transition duration-300 ${selected ? "border-primary/70 bg-primary/[0.07] shadow-[0_18px_45px_rgba(139,92,246,0.08)]" : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-white/15 hover:bg-background/65"}`}>{children}</button>;
}

function SubmissionState() {
  return <div className="flex min-h-[520px] flex-col items-center justify-center text-center"><div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-primary/25 bg-primary/10 text-primary shadow-[0_0_50px_rgba(139,92,246,0.14)]"><IconCheck size={36} stroke={1.7} /></div><p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Request received</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your custom build is in review.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-muted">We have captured your brief. The next step is a feasibility and pricing review from the 3D team. No payment was taken.</p><div className="mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-background/45 p-4 text-left"><p className="text-[10px] tracking-[0.16em] text-primary">01</p><p className="mt-2 text-sm font-medium">Feasibility</p><p className="mt-1 text-xs text-muted">Model and reference review</p></div><div className="rounded-2xl border border-border bg-background/45 p-4 text-left"><p className="text-[10px] tracking-[0.16em] text-primary">02</p><p className="mt-2 text-sm font-medium">Quote</p><p className="mt-1 text-xs text-muted">Final price and timeline</p></div><div className="rounded-2xl border border-border bg-background/45 p-4 text-left"><p className="text-[10px] tracking-[0.16em] text-primary">03</p><p className="mt-2 text-sm font-medium">Production</p><p className="mt-1 text-xs text-muted">Starts after approval</p></div></div><Link href="/account/orders" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs font-semibold transition hover:border-primary hover:bg-surface-elevated">View account <IconArrowRight size={15} /></Link></div>;
}
