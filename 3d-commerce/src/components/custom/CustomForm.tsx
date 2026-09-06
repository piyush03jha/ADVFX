"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { IconChevronDown, IconInfoCircle } from "@tabler/icons-react";

import {
  bodyOptions,
  calculatePrice,
  frameOptions,
  headOptions,
  processSteps,
  sizeOptions,
} from "./customOptions";
import { ChoiceGrid, VisualChoice } from "./CustomChoiceCards";
import { CustomUploadZone } from "./CustomUploadZone";
import { CustomSummarySidebar } from "./CustomSummarySidebar";

export interface CustomSubmission {
  price: number;
  bodyLabel: string;
  headLabel: string;
  sizeLabel: string;
  frameLabel: string;
}

export function CustomForm({ body, onBodyChange, head, onHeadChange, onSubmit }: {
  body: string;
  onBodyChange: (value: string) => void;
  head: string;
  onHeadChange: (value: string) => void;
  onSubmit: (submission: CustomSubmission) => void;
}) {
  const [size, setSize] = useState("15");
  const [frame, setFrame] = useState("single");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [details, setDetails] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const selectedBody = bodyOptions.find((option) => option.id === body) ?? bodyOptions[1];
  const selectedHead = headOptions.find((option) => option.id === head) ?? headOptions[1];
  const selectedSize = sizeOptions.find((option) => option.value === size) ?? sizeOptions[2];
  const selectedFrame = frameOptions.find((option) => option.id === frame) ?? frameOptions[0];
  const price = useMemo(() => calculatePrice({ body: selectedBody, head: selectedHead, frame: selectedFrame, size: selectedSize }), [selectedBody, selectedHead, selectedFrame, selectedSize]);
  const hasReference = files.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!hasReference) return;
    onSubmit({ price, bodyLabel: selectedBody.label, headLabel: selectedHead.label, sizeLabel: selectedSize.label, frameLabel: selectedFrame.label });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="space-y-5">
        <FormSection step="1" title="Body" helper="See the difference in the references above.">
          <VisualChoice options={bodyOptions} value={body} onChange={onBodyChange} />
        </FormSection>

        <FormSection step="2" title="Head" helper="Choose the finish that suits your character.">
          <VisualChoice options={headOptions} value={head} onChange={onHeadChange} />
        </FormSection>

        <FormSection step="3" title="Who is in the frame?" helper="Adding a partner, pet or group changes the fixed price.">
          <ChoiceGrid options={frameOptions} value={frame} onChange={setFrame} />
        </FormSection>

        <FormSection step="4" title="Size" helper="Choose the final display height. Price updates instantly.">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center">
            <div className="relative">
              <select value={size} onChange={(event) => setSize(event.target.value)} className="h-14 w-full appearance-none rounded-2xl border border-border bg-background/60 px-4 pr-11 text-sm font-medium outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30">
                {sizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <IconChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] px-4 py-3 text-xs leading-5 text-muted">
              <IconInfoCircle size={15} className="mb-1 text-primary" />
              A larger piece preserves more detail and increases the fixed price.
            </div>
          </div>
        </FormSection>

        <FormSection step="5" title="Upload your references" helper="Photos work best with front, back, left and right views. You can also send a 3D model you already have.">
          <CustomUploadZone files={files} onFilesChange={setFiles} error={fileError} onErrorChange={setFileError} />
          {attemptedSubmit && !hasReference && <p className="mt-3 text-xs text-error">Add at least one photo or 3D file before submitting.</p>}
        </FormSection>

        <FormSection step="6" title="Anything else?" helper="Optional. Add only the details you want our team to notice.">
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={5} placeholder="Example: Keep the smile from the front photo, use the blue jacket, and place my dog beside me." className="w-full resize-none rounded-2xl border border-border bg-background/45 p-4 text-sm leading-6 outline-none placeholder:text-muted focus:border-primary/60 focus:ring-1 focus:ring-primary/30" />
          <div className="mt-2 text-right text-[10px] text-muted">{details.length}/1000</div>
        </FormSection>

        <FormSection step="7" title="What happens next">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {processSteps.map((processStep, index) => (
              <div key={processStep.title} className="min-h-[128px] rounded-2xl border border-border bg-background/40 p-4">
                <span className="text-[10px] uppercase tracking-[0.14em] text-primary">Step {index + 1}</span>
                <p className="mt-2 text-sm font-medium">{processStep.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted">{processStep.description}</p>
              </div>
            ))}
          </div>
        </FormSection>
      </div>

      <CustomSummarySidebar body={selectedBody} head={selectedHead} frame={selectedFrame} size={selectedSize} price={price} hasReference={hasReference} />
    </form>
  );
}

function FormSection({ step, title, helper, children }: { step: string; title: string; helper?: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border bg-surface/45 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.08)] sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary">{step}</span>
        <h3 className="text-sm font-medium sm:text-base">{title}</h3>
      </div>
      {helper && <p className="mt-2 pl-10 text-xs leading-5 text-muted">{helper}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
