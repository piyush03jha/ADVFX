"use client";

import { IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

interface Option { label: string; basePrice?: number; addPrice?: number; priceLabel?: string; }

export function CustomSummarySidebar({ body, head, frame, size, price, hasReference }: { body: Option; head: Option; frame: Option; size: { label: string; multiplier: number }; price: number; hasReference: boolean }) {
  const items = [
    { label: body.label, amount: `₹${body.basePrice?.toLocaleString("en-IN") ?? "—"}` },
    ...(head.addPrice ? [{ label: head.label, amount: `+₹${head.addPrice.toLocaleString("en-IN")}` }] : []),
    ...(frame.addPrice ? [{ label: frame.label, amount: `+₹${frame.addPrice.toLocaleString("en-IN")}` }] : []),
  ];

  return (
    <aside className="h-fit rounded-[28px] border border-border bg-surface/60 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:sticky lg:top-24 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Your build</p>
      <div className="mt-4 space-y-2.5">
        {items.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 text-xs"><span className="text-muted">{item.label}</span><span>{item.amount}</span></div>)}
        <div className="flex items-center justify-between gap-4 text-xs"><span className="text-muted">Size · {size.label}</span><span>×{size.multiplier}</span></div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Fixed price</p>
        <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">₹{price.toLocaleString("en-IN")}</p>
        <p className="mt-1 text-[10px] text-muted">Based on the options you selected.</p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${hasReference ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><IconCheck size={12} /></span>
        <span className={hasReference ? "text-foreground" : "text-muted"}>{hasReference ? "Reference ready" : "Add a reference"}</span>
      </div>

      <Button type="submit" variant="primary" size="md" disabled={!hasReference} className="mt-5 min-h-14 w-full disabled:cursor-not-allowed disabled:opacity-45">
        Request this build
      </Button>

      {!hasReference && <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted"><IconInfoCircle size={14} className="mt-0.5 shrink-0 text-primary" />Upload at least one photo or 3D model to continue.</p>}
      <p className="mt-4 text-[11px] leading-5 text-muted">Your request is reviewed before production. The fixed price shown here is based on your selections.</p>
    </aside>
  );
}
