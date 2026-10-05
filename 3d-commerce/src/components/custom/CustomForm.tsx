"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconChevronDown, IconStar } from "@tabler/icons-react";
import {
  bodyOptions,
  calculateCategoryPrice,
  calculatePrice,
  frameOptions,
  processSteps,
  sizeOptions,
} from "./customOptions";
import { CustomUploadZone } from "./CustomUploadZone";
import { resolveMediaUrl } from "@/lib/media-url";

type ConfigOption = { id:string; section:string; slug:string; name:string; description?:string|null; imageUrl?:string|null; priceMinor:number; multiplier?:number|null; sortOrder:number; isActive:boolean };
type ConfigCategory = { id:string; slug:CustomCategory; name:string; description?:string|null; imageUrl?:string|null; basePriceMinor:number; options:ConfigOption[] };

export type CustomCategory =
  | "person"
  | "pet"
  | "object"
  | "vehicle"
  | "character"
  | "other";

export interface CustomSubmission {
  requestId: string;
  category: CustomCategory;
  price: number;
  bodyLabel: string;
  headLabel: string;
  sizeLabel: string;
  frameLabel: string;
}

interface CustomFormProps {
  body: string;
  onBodyChange: (value: string) => void;
  head: string;
  onHeadChange: (value: string) => void;
  onSubmit: (submission: CustomSubmission) => void;
}

const gallery = [
  { id: "full", label: "Full body", image: "/catogeries/2.jpg" },
  { id: "half", label: "Half body", image: "/catogeries/1.jpg" },
  { id: "stationary", label: "Stationary head", image: "/catogeries/4.jpg" },
];

const categories: Array<{
  id: CustomCategory;
  label: string;
  description: string;
  image: string;
}> = [
  { id: "person", label: "Person", description: "Portraits and figurines", image: "/catogeries/2.jpg" },
  { id: "pet", label: "Pet / Animal", description: "Turn your companion into a keepsake", image: "/catogeries/1.jpg" },
  { id: "object", label: "Product / Object", description: "Replicas, parts, sculptures & more", image: "/catogeries/4.jpg" },
  { id: "vehicle", label: "Vehicle", description: "Cars, bikes and display models", image: "/catogeries/2.jpg" },
  { id: "character", label: "Character / Collectible", description: "Gaming, anime and stylized figures", image: "/catogeries/3.jpg" },
  { id: "other", label: "Other", description: "Something unique? Tell us what you need", image: "/catogeries/4.jpg" },
];

export function CustomForm({
  body,
  onBodyChange,
  head,
  onHeadChange,
  onSubmit,
}: CustomFormProps) {
  const [category, setCategory] = useState<CustomCategory>("person");
  const [size, setSize] = useState("15");
  const [frame, setFrame] = useState("single");
  const [files, setFiles] = useState<File[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [details, setDetails] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverPrice, setServerPrice] = useState<number | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [config, setConfig] = useState<{categories:ConfigCategory[];sizeOptions:ConfigOption[]}|null>(null);
  const router = useRouter();

  useEffect(() => { void fetch("/api/custom-requests/config",{cache:"no-store"}).then(r=>r.ok?r.json():null).then((d)=>{ if(d?.categories) setConfig(d); }).catch(()=>{}); }, []);

  const configuredCategory = config?.categories.find((option) => option.slug === category);
  const configured = (section:string, slug:string|undefined) => configuredCategory?.options.find((option)=>option.section===section && option.slug===slug);
  const selectedBody =
    configured("body", body) ? { id: body, label: configured("body", body)!.name, description: configured("body", body)!.description ?? "", basePrice: configured("body", body)!.priceMinor / 100, image: resolveMediaUrl(configured("body", body)!.imageUrl) ?? "/catogeries/1.jpg" } : (bodyOptions.find((option) => option.id === body) ?? bodyOptions[1]);
  const configuredSize = config?.sizeOptions.find((option) => option.slug === size);
  const selectedSize = configuredSize ? { value: size, label: configuredSize.name, multiplier: configuredSize.multiplier ?? 1 } : (sizeOptions.find((option) => option.value === size) ?? sizeOptions[2]);
  const selectedFrame =
    configured("frame", frame) ? { id: frame, label: configured("frame", frame)!.name, description: configured("frame", frame)!.description ?? "", addPrice: configured("frame", frame)!.priceMinor / 100, image: resolveMediaUrl(configured("frame", frame)!.imageUrl) ?? "/catogeries/4.jpg" } : (frameOptions.find((option) => option.id === frame) ?? frameOptions[0]);

  const isPerson = category === "person";
  const rawCategory = config?.categories.find((option) => option.slug === category);
  const selectedCategory = rawCategory
    ? {
        label: rawCategory.name,
        description: rawCategory.description ?? "",
        image: resolveMediaUrl(rawCategory.imageUrl) ?? "/catogeries/4.jpg",
      }
    : (categories.find((option) => option.id === category) ?? categories[0]);

  const localPrice = isPerson
    ? calculatePrice({
        body: selectedBody,
        head: { addPrice: 0 },
        frame: selectedFrame,
        size: selectedSize,
      })
    : calculateCategoryPrice({
        category,
        head: { addPrice: 0 },
        size: selectedSize,
      });

  useEffect(() => {
    let cancelled = false;
    setPricingLoading(true);
    setPricingError(null);

    void fetch("/api/custom-requests/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        bodyType: isPerson ? body : undefined,
        subjectType: isPerson ? frame : undefined,
        sizeCm: Number(size),
      }),
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? data?.message ?? "Unable to calculate custom price.");
        }
        return data as { amountMinor: number };
      })
      .then((data) => {
        if (!cancelled) setServerPrice(data.amountMinor);
      })
      .catch((error) => {
        if (!cancelled) {
          setServerPrice(null);
          setPricingError(
            error instanceof Error ? error.message : "Unable to calculate custom price.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, body, frame, isPerson, size]);

  const price = serverPrice ?? localPrice;

  const displayCategories = config?.categories.map((item) => ({ id: item.slug, label: item.name, description: item.description ?? "", image: resolveMediaUrl(item.imageUrl) ?? "/catogeries/4.jpg" })) ?? categories;
  const hasReference = files.length > 0;
  const [previewImage, setPreviewImage] = useState(selectedCategory.image);
  const [previewLabel, setPreviewLabel] = useState(selectedCategory.label);
  const activeGallery = { id: "selected", label: previewLabel, image: previewImage };

  function selectCategory(value: CustomCategory) {
    setCategory(value);
    const nextCategory = config?.categories.find((item) => item.slug === value);
    setPreviewImage(resolveMediaUrl(nextCategory?.imageUrl) ?? categories.find((item) => item.id === value)?.image ?? "/catogeries/4.jpg");
    setPreviewLabel(nextCategory?.name || categories.find((item) => item.id === value)?.label || value);
  }

  function handleBodyChange(value: string) {
    onBodyChange(value);
    if (isPerson) {
      const option = configured("body", value);
      setPreviewImage(resolveMediaUrl(option?.imageUrl) ?? bodyOptions.find((item) => item.id === value)?.image ?? selectedCategory.image);
      setPreviewLabel(option?.name || bodyOptions.find((item) => item.id === value)?.label || value);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (!hasReference || submitting) return;

    setFileError("");
    setSubmitting(true);

    try {
      const requirements = [
        `Category: ${selectedCategory.label}`,
        `Body type: ${isPerson ? selectedBody.label : "Not applicable"}`,
        `Person in frame: ${isPerson ? selectedFrame.label : "Not applicable"}`,
        `Size: ${selectedSize.label}`,
        details.trim() ? `Additional requirements:\n${details.trim()}` : "",
      ].filter(Boolean).join("\n");

      if (serverPrice == null || pricingLoading || pricingError) {
        throw new Error(pricingError ?? "Custom price is still being calculated.");
      }

      const requestResponse = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Custom ${selectedCategory.label}`,
          requirements,
          dimensions: selectedSize.label,
          notes: details.trim() || undefined,
          category,
          bodyType: isPerson ? body : undefined,
          subjectType: isPerson ? frame : undefined,
          personCount:
            frame === "single" ? 1 : frame === "couple" ? 2 : frame === "group" ? 3 : 1,
          petCount: frame === "pet" ? 1 : 0,
          sizeCm: Number(size),
        }),
        cache: "no-store",
      });

      const requestBody = (await requestResponse.json().catch(() => null)) as
        | { id?: string; message?: string | string[]; error?: string }
        | null;

      if (!requestResponse.ok || !requestBody?.id) {
        const message =
          requestBody && "message" in requestBody
            ? Array.isArray(requestBody.message)
              ? requestBody.message[0]
              : requestBody.message ?? "Unable to submit custom request."
            : requestBody?.error ?? "Unable to submit custom request.";
        throw new Error(message);
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(
          `/api/custom-requests/${encodeURIComponent(requestBody.id)}/files`,
          {
            method: "POST",
            body: formData,
          },
        );

        const uploadBody = (await uploadResponse.json().catch(() => null)) as
          | { message?: string | string[]; error?: string }
          | null;

        if (!uploadResponse.ok) {
          const message =
            uploadBody && "message" in uploadBody
              ? Array.isArray(uploadBody.message)
                ? uploadBody.message[0]
                : uploadBody.message ?? "Unable to upload one of your references."
              : uploadBody?.error ?? "Unable to upload one of your references.";
          throw new Error(message);
        }
      }

      if (modelFile) {
        const formData = new FormData();
        formData.append("file", modelFile);

        const uploadResponse = await fetch(
          `/api/custom-requests/${encodeURIComponent(requestBody.id)}/files`,
          { method: "POST", body: formData },
        );
        const uploadBody = (await uploadResponse.json().catch(() => null)) as
          | { message?: string | string[]; error?: string }
          | null;
        if (!uploadResponse.ok) {
          const message =
            uploadBody && "message" in uploadBody
              ? Array.isArray(uploadBody.message)
                ? uploadBody.message[0]
                : uploadBody.message ?? "Unable to upload your 3D reference."
              : uploadBody?.error ?? "Unable to upload your 3D reference.";
          throw new Error(message);
        }
      }

      onSubmit({
        requestId: requestBody.id,
        category,
        price,
        bodyLabel: isPerson ? selectedBody.label : "Not applicable",
        headLabel: "Default",
        sizeLabel: selectedSize.label,
        frameLabel: isPerson ? selectedFrame.label : "Not applicable",
      });
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Custom request service is unavailable. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[1380px]">
      <div className="mb-4 flex items-center gap-2 pt-2 text-xs text-muted sm:mb-5">
        <span>Home</span>
        <span>/</span>
        <span className="text-foreground">Custom</span>
      </div>

      <div className="grid overflow-hidden rounded-[24px] border border-border bg-surface/80 shadow-[0_30px_100px_rgba(0,0,0,0.12)] backdrop-blur-xl lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
        <div className="relative flex min-h-0 flex-col bg-surface p-3 sm:p-4 lg:h-[calc(100svh-120px)] lg:max-h-[820px] lg:min-h-[620px]">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] border border-border bg-surface-elevated">
            <img src={activeGallery.image} alt={activeGallery.label} className="absolute inset-0 h-full w-full object-contain transition duration-500" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-foreground/5" />
            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-foreground/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/80 backdrop-blur-md">
              Custom 3D Studio
            </div>
            <button type="button" disabled aria-label="Previous product example" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur-md sm:left-5">
              <span className="text-xl">‹</span>
            </button>
            <button type="button" disabled aria-label="Next product example" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur-md sm:right-5">
              <span className="text-xl">›</span>
            </button>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Example product
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                {activeGallery.label}
              </h2>
            </div>
          </div>


        </div>

        <div className="flex flex-col bg-surface/80 p-5 sm:p-7 lg:max-h-[calc(100svh-120px)] lg:overflow-y-auto lg:p-9">
          <div className="border-b border-border pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Custom creation studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Your idea. Our craft.
            </h1>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-0.5 text-primary">
                {[0, 1, 2, 3, 4].map((star) => (
                  <IconStar key={star} size={14} fill="currentColor" />
                ))}
              </span>
              <span className="font-medium">Custom service</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Upload your reference photos, choose the size, and tell us what you need. We review it, prepare the model, make the physical piece, and arrange delivery.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <CompactSection label="What would you like to create?" hint={selectedCategory.label}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {displayCategories.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectCategory(option.id)}
                    className={`group overflow-hidden rounded-2xl border text-left transition ${category === option.id ? "border-primary/70 bg-primary/[0.07]" : "border-border bg-surface hover:border-primary/35 hover:bg-surface-hover"}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
                      <img src={option.image} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />
                      {category === option.id && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                          <IconCheck size={11} />
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold">{option.label}</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CompactSection>

            {isPerson ? (
              <>
                <CompactSection label="Type">
                  <div className="grid grid-cols-2 gap-2">
                    {bodyOptions.map((option) => (
                      <SelectionButton
                        key={option.id}
                        label={option.label}
                        price={option.priceLabel}
                        description={option.description}
                        selected={body === option.id}
                        onClick={() => handleBodyChange(option.id)}
                      />
                    ))}
                  </div>
                </CompactSection>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-surface/45 p-4">
                <p className="text-xs font-semibold">
                  Built for {selectedCategory.label.toLowerCase()}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Upload your references below. The selected size is stored with your request.
                </p>
              </div>
            )}

            <CompactSection label="Size">
              <div className="relative">
                <select value={size} onChange={(event) => { const value = event.target.value; setSize(value); const option = config?.sizeOptions.find((item) => item.slug === value); setPreviewImage(resolveMediaUrl(option?.imageUrl) ?? selectedCategory.image); setPreviewLabel(option?.name || `${value} cm`); }} className="h-12 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 pr-10 text-sm font-medium outline-none focus:border-primary/60">
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <IconChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </CompactSection>
          </div>

          <div className="mt-auto pt-7">
            <div className="flex items-end justify-between gap-4 border-t border-border pt-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Estimated configuration
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
                  ₹{price.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Size
                </p>
                <p className="mt-1 text-sm font-medium">{selectedSize.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <div className="rounded-[24px] border border-border bg-surface/45 p-5 sm:p-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Your references
            </p>
            <h3 className="mt-1 text-lg font-semibold">Upload reference photos</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Add up to 5 JPG/PNG reference images (50 MB total). You can also provide one 3D reference file up to 100 MB.
            </p>
          </div>

          <div className="mt-5">
            <CustomUploadZone
              files={files}
              onFilesChange={setFiles}
              modelFile={modelFile}
              onModelFileChange={setModelFile}
              error={fileError}
              onErrorChange={setFileError}
            />
          </div>

          {attemptedSubmit && !hasReference && (
            <p className="mt-3 text-xs text-error">
              Please upload at least one JPG/PNG reference before requesting your build.
            </p>
          )}

          <div className="mt-5">
            <label className="text-xs font-medium">
              Anything else? <span className="font-normal text-muted">Optional</span>
            </label>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Tell us anything important about the pose, clothing, expression, dimensions or scene."
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background/45 p-3.5 text-sm leading-6 outline-none placeholder:text-muted focus:border-primary/60"
            />
            <div className="mt-1 text-right text-[10px] text-muted">{details.length}/1000</div>
          </div>
        </div>

        <aside className="h-fit rounded-[24px] border border-border bg-surface/60 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Your request
          </p>
          <h3 className="mt-1 text-lg font-semibold">Ready to submit</h3>
          <div className="mt-5 space-y-2.5">
            <SummaryRow label="Category" value={selectedCategory.label} />
            <SummaryRow label="Size" value={selectedSize.label} />
            <SummaryRow
              label={pricingLoading ? "Calculating price" : "Price"}
              value={`₹${price.toLocaleString("en-IN")}`}
            />
          </div>

          <button
            type="submit"
            disabled={!hasReference || submitting || pricingLoading || Boolean(pricingError) || serverPrice == null}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting
              ? "Preparing payment…"
              : pricingLoading
                ? "Calculating price…"
                : "Continue to payment"}
          </button>
        </aside>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {processSteps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-border bg-surface/35 p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
              0{index + 1}
            </p>
            <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{step.description}</p>
          </div>
        ))}
      </div>
    </form>
  );
}

function CompactSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function SelectionButton({
  label,
  price,
  description,
  image,
  selected,
  onClick,
}: {
  label: string;
  image?: string;
  price: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${selected ? "border-primary/60 bg-primary/[0.07]" : "border-border bg-surface hover:border-primary/35 hover:bg-surface-hover"}`}
    >
      {image && <div className="mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-surface-elevated"><img src={image} alt="" className="h-full w-full object-cover" /></div>}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        <span className="text-[10px] font-medium text-primary">{price}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-muted">{description}</p>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}