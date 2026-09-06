"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconInfoCircle,
  IconStar,
  IconUpload,
} from "@tabler/icons-react";

import {
  bodyOptions,
  calculatePrice,
  frameOptions,
  headOptions,
  processSteps,
  sizeOptions,
} from "./customOptions";
import { CustomUploadZone } from "./CustomUploadZone";

export interface CustomSubmission {
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
  { id: "bobble", label: "Bobble head", image: "/catogeries/3.jpg" },
  { id: "half", label: "Half body", image: "/catogeries/1.jpg" },
  { id: "stationary", label: "Stationary head", image: "/catogeries/4.jpg" },
];

export function CustomForm({
  body,
  onBodyChange,
  head,
  onHeadChange,
  onSubmit,
}: CustomFormProps) {
  const [size, setSize] = useState("15");
  const [frame, setFrame] = useState("single");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [details, setDetails] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const selectedBody =
    bodyOptions.find((option) => option.id === body) ?? bodyOptions[1];
  const selectedHead =
    headOptions.find((option) => option.id === head) ?? headOptions[0];
  const selectedSize =
    sizeOptions.find((option) => option.value === size) ?? sizeOptions[2];
  const selectedFrame =
    frameOptions.find((option) => option.id === frame) ?? frameOptions[0];

  const price = useMemo(
    () =>
      calculatePrice({
        body: selectedBody,
        head: selectedHead,
        frame: selectedFrame,
        size: selectedSize,
      }),
    [selectedBody, selectedHead, selectedFrame, selectedSize],
  );

  const hasReference = files.length > 0;
  const activeGallery = gallery[activeImage];

  function showGalleryImage(id: string) {
    const index = gallery.findIndex((item) => item.id === id);
    if (index >= 0) setActiveImage(index);
  }

  function handleBodyChange(value: string) {
    onBodyChange(value);
    showGalleryImage(value);
  }

  function handleHeadChange(value: string) {
    onHeadChange(value);
    showGalleryImage(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (!hasReference) return;

    onSubmit({
      price,
      bodyLabel: selectedBody.label,
      headLabel: selectedHead.label,
      sizeLabel: selectedSize.label,
      frameLabel: selectedFrame.label,
    });
  }

  const nextImage = () =>
    setActiveImage((current) => (current + 1) % gallery.length);

  const previousImage = () =>
    setActiveImage(
      (current) => (current - 1 + gallery.length) % gallery.length,
    );

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[1380px]">
      <div className="mb-4 flex items-center gap-2 pt-2 text-xs text-muted sm:mb-5">
        <span className="hover:text-foreground">Home</span>
        <span>/</span>
        <span className="text-foreground">Custom</span>
      </div>

      <div className="grid overflow-hidden rounded-[24px] border border-border bg-surface/55 shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
        <div className="relative flex min-h-0 flex-col bg-[#0b0b0c] p-3 sm:p-4 lg:h-[calc(100svh-120px)] lg:max-h-[820px] lg:min-h-[620px]">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] border border-white/10 bg-[#151516] lg:min-h-0">
            <img
              src={activeGallery.image}
              alt={activeGallery.label}
              className="absolute inset-0 h-full w-full object-contain transition duration-500"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />

            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 backdrop-blur-md sm:left-5 sm:top-5">
              Custom 3D Studio
            </div>

            <button
              type="button"
              onClick={previousImage}
              aria-label="Previous product example"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60 sm:left-5"
            >
              <span className="text-xl">‹</span>
            </button>

            <button
              type="button"
              onClick={nextImage}
              aria-label="Next product example"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60 sm:right-5"
            >
              <span className="text-xl">›</span>
            </button>

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                    Example product
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    {activeGallery.label}
                  </h2>
                </div>
                <span className="hidden rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] text-white/65 backdrop-blur-md sm:block">
                  Explore examples
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid shrink-0 grid-cols-4 gap-2 sm:mt-4 sm:gap-3">
            {gallery.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Show ${item.label} example`}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                  activeImage === index
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-white/10 opacity-65 hover:opacity-100"
                }`}
              >
                <img src={item.image} alt="" className="h-full w-full object-cover" />
                {activeImage === index && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <IconCheck size={12} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-background/80 p-5 sm:p-7 lg:max-h-[calc(100svh-120px)] lg:overflow-y-auto lg:p-9">
          <div className="border-b border-border pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Made from your photos
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Custom Bobble Heads & 3D Figures
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-0.5 text-primary">
                {[0, 1, 2, 3, 4].map((star) => (
                  <IconStar key={star} size={14} fill="currentColor" />
                ))}
              </span>
              <span className="font-medium">4.9/5</span>
              <span className="text-muted">from custom customers</span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              Choose the essentials below. Click a style to see its example on
              the left, then continue with your fixed-price build.
            </p>
          </div>

          <div className="mt-6 space-y-6">
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

            <CompactSection label="Head connection">
              <div className="grid grid-cols-2 gap-2">
                {headOptions.map((option) => (
                  <SelectionButton
                    key={option.id}
                    label={option.label}
                    price={option.priceLabel}
                    description={option.description}
                    selected={head === option.id}
                    onClick={() => handleHeadChange(option.id)}
                  />
                ))}
              </div>
            </CompactSection>

            <CompactSection label="Size">
              <div className="relative">
                <select
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 pr-10 text-sm font-medium outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                >
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </CompactSection>

            <CompactSection label="Person in frame">
              <div className="relative">
                <select
                  value={frame}
                  onChange={(event) => setFrame(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 pr-10 text-sm font-medium outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                >
                  {frameOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} — {option.priceLabel}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </CompactSection>

            <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-3.5">
              <div className="flex items-start gap-2">
                <IconInfoCircle size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted">
                  Price changes automatically with size, body type and the
                  number of people or pets.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-7">
            <div className="flex items-end justify-between gap-4 border-t border-border pt-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Fixed price
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
                  ₹{price.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  Inclusive of selected options
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Your references
              </p>
              <h3 className="mt-1 text-lg font-semibold">
                Upload photos or your existing 3D model
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                Front, back, left and right photos give our team the best
                likeness. One image is enough to start.
              </p>
            </div>
            <IconUpload size={20} className="hidden text-muted sm:block" />
          </div>

          <div className="mt-5">
            <CustomUploadZone
              files={files}
              onFilesChange={setFiles}
              error={fileError}
              onErrorChange={setFileError}
            />
          </div>

          {attemptedSubmit && !hasReference && (
            <p className="mt-3 text-xs text-error">
              Please upload at least one reference before requesting your build.
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
              placeholder="Tell us anything important about the pose, clothing, pet, expression or scene."
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background/45 p-3.5 text-sm leading-6 outline-none placeholder:text-muted focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
            <div className="mt-1 text-right text-[10px] text-muted">
              {details.length}/1000
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[24px] border border-border bg-surface/60 p-5 sm:p-6 lg:sticky lg:top-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Order summary
          </p>
          <div className="mt-4 space-y-3 text-xs">
            <SummaryRow label="Type" value={selectedBody.label} />
            <SummaryRow label="Head" value={selectedHead.label} />
            <SummaryRow label="Frame" value={selectedFrame.label} />
            <SummaryRow label="Size" value={selectedSize.label} />
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted">
              Total fixed price
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
              ₹{price.toLocaleString("en-IN")}
            </p>
          </div>

          <button
            type="submit"
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasReference}
          >
            Request this build
          </button>

          {!hasReference && (
            <p className="mt-2 text-center text-[10px] leading-4 text-muted">
              Upload a photo or 3D model to continue.
            </p>
          )}

          <p className="mt-4 text-[10px] leading-5 text-muted">
            We review your references, prepare the model, then move it into
            physical production after approval.
          </p>
        </aside>
      </div>

      <div className="mt-5 rounded-[24px] border border-border bg-surface/35 p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          What happens next
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <div
              key={step.title}
              className="min-h-[112px] rounded-xl border border-border bg-background/35 p-4"
            >
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                0{index + 1}
              </span>
              <p className="mt-2 text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-[10px] leading-5 text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

function CompactSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {children}
    </section>
  );
}

function SelectionButton({
  label,
  price,
  description,
  selected,
  onClick,
}: {
  label: string;
  price: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[78px] items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition sm:min-h-[84px] sm:px-4 ${
        selected
          ? "border-primary/70 bg-primary/[0.07] ring-1 ring-primary/20"
          : "border-border bg-surface hover:border-white/20 hover:bg-surface-elevated"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold sm:text-sm">
          {label}
        </span>
        <span className="mt-1 block truncate text-[10px] leading-4 text-muted">
          {description}
        </span>
        <span className="mt-1 block text-[10px] font-medium text-primary">
          {price}
        </span>
      </span>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-primary bg-primary text-white"
            : "border-border text-transparent"
        }`}
      >
        <IconCheck size={11} />
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
