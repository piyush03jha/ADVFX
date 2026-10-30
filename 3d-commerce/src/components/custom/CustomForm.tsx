"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconCheck, IconStar } from "@tabler/icons-react";
import { processSteps } from "./customOptions";
import { CustomUploadZone } from "./CustomUploadZone";
import { resolveMediaUrl } from "@/lib/media-url";

type ConfigOption = { id:string; section:string; slug:string; name:string; description?:string|null; imageUrl?:string|null; priceMinor:number; multiplier?:number|null; sortOrder:number; isActive:boolean };
type HeightRange = { id:string; minCm:number; maxCm:number; priceMinor:number };
type ConfigCategory = { id:string; slug:CustomCategory; name:string; description?:string|null; imageUrl?:string|null; basePriceMinor:number; options:ConfigOption[]; heightRanges:HeightRange[] };

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

export function CustomForm({
  body,
  onBodyChange,
  head,
  onHeadChange,
  onSubmit,
}: CustomFormProps) {
  const [category, setCategory] = useState<CustomCategory>("person");
  const [customHeight, setCustomHeight] = useState("");
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
  const [config, setConfig] = useState<{categories:ConfigCategory[]}|null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configAttempt, setConfigAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Abort a hung request so visitors get the retry/contact fallback instead
    // of an endless "Loading…" card when the API is slow or blocked.
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    void fetch("/api/custom-requests/config", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.categories?.length) {
          throw new Error(data?.error ?? data?.message ?? "Custom configuration is unavailable.");
        }
        return data as { categories: ConfigCategory[] };
      })
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setConfigError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setConfig(null);
          setConfigError(
            error instanceof Error && error.name !== "AbortError"
              ? error.message
              : "The custom studio is taking too long to load.",
          );
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [configAttempt]);

  useEffect(() => {
    if (!config?.categories.length) return;
    const nextCategory = config.categories.find((item) => item.slug === category) ?? config.categories[0];
    if (nextCategory.slug !== category) setCategory(nextCategory.slug);

    const bodyOption = nextCategory.options.find((item) => item.section === "body" && item.slug === body)
      ?? nextCategory.options.find((item) => item.section === "body");
    if (bodyOption && bodyOption.slug !== body) onBodyChange(bodyOption.slug);

    const frameOption = nextCategory.options.find((item) => item.section === "frame" && item.slug === frame)
      ?? nextCategory.options.find((item) => item.section === "frame");
    if (frameOption && frameOption.slug !== frame) setFrame(frameOption.slug);
  }, [config, category, body, frame, onBodyChange]);

  const configuredCategory = config?.categories.find((option) => option.slug === category) ?? config?.categories[0];
  const configured = (section: string, slug?: string) =>
    configuredCategory?.options.find((option) => option.section === section && option.slug === slug);
  const selectedBody = configured("body", body);
  const selectedFrame = configured("frame", frame);
  const isPerson = category === "person";
  const selectedCategory = configuredCategory;
  const heightRanges = configuredCategory?.heightRanges ?? [];
  const heightCm = Math.round(Number(customHeight) * 10) / 10;
  const heightLabel = customHeight.trim() === "" ? "Not entered" : `${heightCm} cm`;
  const customDimensions = `Height ${heightCm} cm`;
  const customSizeValid =
    customHeight.trim() !== "" && Number.isFinite(heightCm) && heightCm > 0;

  // The quote API returns minor units (paise); show whole rupees like the
  // payment page does. Nothing is priced until a valid height is entered.
  const price = customSizeValid && serverPrice != null ? serverPrice / 100 : 0;
  const priceReady = customSizeValid && serverPrice != null && !pricingLoading && !pricingError;

  useEffect(() => {
    // The price is the admin-configured price for the typed height, so it is
    // only requested once a valid height has been entered.
    if (!customSizeValid) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
    setPricingError(null);
    setPricingLoading(true);
    void fetch("/api/custom-requests/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        bodyType: isPerson ? body : undefined,
        subjectType: isPerson ? frame : undefined,
        sizeCm: heightCm,
      }),
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const detail = Array.isArray(data?.message) ? data.message[0] : data?.message;
          throw new Error(detail ?? data?.error ?? "Unable to calculate custom price.");
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
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [category, body, frame, isPerson, heightCm, customSizeValid]);

  const displayCategories = config?.categories ?? [];
  const hasReference = files.length > 0;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");

  function selectCategory(value: CustomCategory) {
    setCategory(value);
    const nextCategory = config?.categories.find((item) => item.slug === value);
    setPreviewImage(resolveMediaUrl(nextCategory?.imageUrl) ?? null);
    setPreviewLabel(nextCategory?.name ?? value);
  }

  function handleBodyChange(value: string) {
    onBodyChange(value);
    if (isPerson) {
      const option = configured("body", value);
      setPreviewImage(resolveMediaUrl(option?.imageUrl) ?? null);
      setPreviewLabel(option?.name ?? value);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (!customSizeValid) {
      setFileError("Enter your height in centimetres (cm).");
      document.getElementById("custom-size-fields")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!hasReference) {
      document.getElementById("custom-references")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (submitting) return;

    setFileError("");
    setSubmitting(true);

    if (!selectedCategory) {
      setFileError("Custom configuration is unavailable. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    try {
      const requirements = [
        `Category: ${selectedCategory.name}`,
        `Body type: ${isPerson ? selectedBody?.name ?? "Not selected" : "Not applicable"}`,
        `Person in frame: ${isPerson ? selectedFrame?.name ?? "Not selected" : "Not applicable"}`,
        `Requested size: ${customDimensions}`,
        details.trim() ? `Additional requirements:\n${details.trim()}` : "",
      ].filter(Boolean).join("\n");

      if (!priceReady) {
        throw new Error(pricingError ?? "Custom price is still being calculated.");
      }

      const requestResponse = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Custom ${selectedCategory.name}`,
          requirements,
          dimensions: customDimensions,
          notes: details.trim() || undefined,
          category,
          bodyType: isPerson ? body : undefined,
          subjectType: isPerson ? frame : undefined,
          personCount:
            frame === "single" ? 1 : frame === "couple" ? 2 : frame === "group" ? 3 : 1,
          petCount: frame === "pet" ? 1 : 0,
          sizeCm: heightCm,
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
        bodyLabel: isPerson ? selectedBody?.name ?? "Not selected" : "Not applicable",
        headLabel: "Default",
        sizeLabel: customDimensions,
        frameLabel: isPerson ? selectedFrame?.name ?? "Not selected" : "Not applicable",
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


  if (!config) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-6 text-center sm:p-8" aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Custom creation studio</p>
        <p className="mt-3 text-sm text-muted">{configError ?? "Loading the custom studio…"}</p>
        {configError ? (
          <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setConfigError(null);
                setConfigAttempt((attempt) => attempt + 1);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
            <a
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Contact us instead
            </a>
          </div>
        ) : null}
      </section>
    );
  }

  if (!selectedCategory) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No active custom configuration is available.</p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[1380px]" noValidate>
      <div className="mb-4 hidden items-center gap-2 pt-2 text-xs text-muted sm:mb-5 sm:flex">
        <span>Home</span>
        <span>/</span>
        <span className="text-foreground">Custom</span>
      </div>

      <div className="grid overflow-hidden rounded-[20px] border border-border bg-surface/80 shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:rounded-[24px] sm:shadow-[0_30px_100px_rgba(0,0,0,0.12)] desk:backdrop-blur-xl desk:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
        <div className="relative flex min-h-0 flex-col bg-surface p-3 sm:p-4 desk:h-[calc(100svh-120px)] desk:max-h-[820px] desk:min-h-[620px]">
          {/* Every child is absolutely positioned, so below the desk breakpoint
              (where the parent has no fixed height) this box collapsed to 0.
              Give it an explicit height on phones/tablets. */}
          <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-[18px] border border-border bg-surface-elevated sm:min-h-[340px] desk:min-h-0">
            {previewImage ? <img src={previewImage} alt={previewLabel} className="absolute inset-0 h-full w-full object-contain transition duration-500" /> : <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.16em] text-muted">{selectedCategory?.name ?? "Custom studio"}</div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-foreground/5" />
            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-foreground/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/80 backdrop-blur-md">
              Custom 3D Studio
            </div>
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
                Example product
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-2xl">
                {previewLabel || selectedCategory?.name || "Custom studio"}
              </h2>
            </div>
          </div>


        </div>

        <div className="flex flex-col bg-surface/80 p-4 sm:p-7 desk:max-h-[calc(100svh-120px)] desk:overflow-y-auto desk:p-9">
          <div className="border-b border-border pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Custom creation studio
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Your idea. Our craft.
            </h2>
            <div className="mt-3 hidden items-center gap-2 text-xs sm:flex">
              <span className="flex items-center gap-0.5 text-primary">
                {[0, 1, 2, 3, 4].map((star) => (
                  <IconStar key={star} size={14} fill="currentColor" />
                ))}
              </span>
              <span className="font-medium">Custom service</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted sm:mt-4">
              Upload your reference photos, enter the height you need, and tell us what you need. We review it, prepare the model, make the physical piece, and arrange delivery.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <CompactSection step={1} label="What would you like to create?" hint={selectedCategory.name}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {displayCategories.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectCategory(option.slug)}
                    className={`group overflow-hidden rounded-2xl border text-left transition ${category === option.slug ? "border-primary/70 bg-primary/[0.07]" : "border-border bg-surface hover:border-primary/35 hover:bg-surface-hover"}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
                      {resolveMediaUrl(option.imageUrl) ? <img src={resolveMediaUrl(option.imageUrl)!} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.12em] text-muted">No image</div>}
                      {category === option.slug && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                          <IconCheck size={11} />
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold">{option.name}</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted">{option.description ?? ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CompactSection>

            {isPerson ? (
              <>
                <CompactSection step={2} label="Type">
                  <div className="grid grid-cols-2 gap-2">
                    {configuredCategory?.options.filter((option) => option.section === "body").map((option) => (
                      <SelectionButton
                        key={option.id}
                        label={option.name}
                        price={option.priceMinor === 0 ? "Included" : `+₹${Math.round(option.priceMinor / 100).toLocaleString("en-IN")}`}
                        description={option.description ?? ""}
                        selected={body === option.slug}
                        onClick={() => handleBodyChange(option.slug)}
                      />
                    ))}
                  </div>
                </CompactSection>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-surface/45 p-4">
                <p className="text-xs font-semibold">
                  Built for {selectedCategory?.name.toLowerCase()}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Upload your references below and enter the height you need.
                </p>
              </div>
            )}

            <section id="custom-size-fields" className="rounded-2xl border border-border bg-background/35 p-4">
              <CompactSection step={isPerson ? 3 : 2} label="Height" hint={heightRanges.length ? "cm" : undefined}>
                <label className="block text-xs font-medium text-foreground">
                  Height (cm)
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={customHeight}
                    onChange={(event) => setCustomHeight(event.target.value)}
                    placeholder="Enter height in cm"
                    inputMode="decimal"
                    className="mt-1.5 h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-base outline-none focus:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15 sm:text-sm"
                  />
                </label>
                {heightRanges.length > 0 ? (
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    Available heights: {heightRanges.map((range) => `${range.minCm}–${range.maxCm} cm`).join(", ")}.
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] leading-5 text-muted">Height pricing is not configured for this category yet.</p>
                )}
                {pricingError && customSizeValid && (
                  <p className="mt-2 text-xs text-error" role="alert">{pricingError}</p>
                )}
              </CompactSection>
            </section>
          </div>

          <div className="mt-auto hidden pt-7 desk:block">
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
                  Height
                </p>
                <p className="mt-1 text-sm font-medium">{heightLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 desk:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <div id="custom-references" className="scroll-mt-24 rounded-[20px] border border-border bg-surface/45 p-4 sm:rounded-[24px] sm:p-7">
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
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background/45 p-3.5 text-base leading-6 outline-none placeholder:text-muted focus:border-primary/60 sm:text-sm"
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
            <SummaryRow label="Category" value={selectedCategory.name} />
            <SummaryRow label="Height" value={heightLabel} />
            <SummaryRow
              label={pricingLoading ? "Calculating price" : "Price"}
              value={`₹${price.toLocaleString("en-IN")}`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !priceReady}
            className="mt-6 hidden h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 desk:flex"
          >
            {submitting
              ? "Preparing payment…"
              : pricingLoading
                ? "Calculating price…"
                : "Continue to payment"}
          </button>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 mt-4 border-t border-border bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6 desk:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 shrink-0"><p className="text-[11px] uppercase tracking-[0.14em] text-muted">{pricingLoading ? "Calculating…" : "Estimated"}</p><p className="text-xl font-semibold tracking-[-0.03em]">₹{price.toLocaleString("en-IN")}</p></div>
          <button type="submit" disabled={submitting || !priceReady} className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">{submitting ? "Preparing payment…" : hasReference ? "Continue to payment" : "Add a photo to continue"}</button>
        </div>
      </div>

      <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-3">
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
  step,
  label,
  hint,
  children,
}: {
  step?: number;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-xs">
          {step !== undefined && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary desk:hidden">
              {step}
            </span>
          )}
          {label}
        </p>
        {hint && <span className="truncate text-[11px] text-muted">{hint}</span>}
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
      className={`min-h-11 rounded-xl border p-3 text-left transition ${selected ? "border-primary/60 bg-primary/[0.07]" : "border-border bg-surface hover:border-primary/35 hover:bg-surface-hover"}`}
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