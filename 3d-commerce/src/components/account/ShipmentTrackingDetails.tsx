"use client";

import { useState } from "react";
import { IconChevronRight, IconCopy } from "@tabler/icons-react";
import { knownCourier, shipmentTrackingUrl } from "@/lib/shipment-tracking";

export function ShipmentTrackingDetails({ carrier, trackingNumber, trackingUrl }: {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}) {
  const [copyMessage, setCopyMessage] = useState("");
  const number = trackingNumber?.trim();
  const courier = knownCourier(carrier);
  const name = courier?.name ?? carrier?.trim();
  const url = shipmentTrackingUrl(carrier, trackingUrl);

  async function copyNumber() {
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      setCopyMessage("Copied!");
    } catch {
      setCopyMessage("Please select and copy the tracking number manually.");
    }
  }

  if (!number) return <p className="mt-4 text-xs leading-5 text-muted">Tracking details will be available once your shipment has been registered.</p>;

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {name && <p className="text-xs text-muted">Delivery partner: <span className="font-medium text-foreground">{name}</span></p>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Tracking / consignment number</p>
          <p className="mt-1 break-all font-mono text-sm font-medium text-foreground select-all">{number}</p>
        </div>
        <button type="button" onClick={() => void copyNumber()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:border-primary/50"><IconCopy size={14} /> Copy ID</button>
      </div>
      <p aria-live="polite" className="text-xs text-muted">{copyMessage}</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-medium text-white">Track on {name || "courier website"} <IconChevronRight size={14} /></a>}
      <p className="text-xs leading-5 text-muted">{url ? "Copy your tracking number, open the courier's website and enter it there to see the latest delivery updates." : "Use the tracking number on your delivery partner's website."} Shipment updates shown here are maintained manually.</p>
    </div>
  );
}
