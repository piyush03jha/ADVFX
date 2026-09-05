"use client";

import { IconCheck, IconMapPin, IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { AddressManager } from "@/components/account/AddressManager";
import { useAddresses, type Address } from "@/context/AddressContext";

interface SavedAddressSelectorProps {
  value: string | null;
  onChange: (address: Address | null) => void;
}

export function SavedAddressSelector({
  value,
  onChange,
}: SavedAddressSelectorProps) {
  const { addresses, defaultAddressId, isLoaded } = useAddresses();
  const [showManager, setShowManager] = useState(false);

  const selectedId = value ?? defaultAddressId;

  if (!isLoaded) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-surface/50" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-surface/50" />
      </div>
    );
  }

  if (showManager) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Manage saved addresses
          </p>

          <button
            type="button"
            onClick={() => setShowManager(false)}
            className="text-[10px] font-medium text-primary hover:text-primary-hover"
          >
            Done
          </button>
        </div>

        <AddressManager
          selectMode
          selectedAddressId={selectedId}
          onSelect={(address) => {
            onChange(address);
            setShowManager(false);
          }}
        />
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setShowManager(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-surface/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconMapPin size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">
            Add a delivery address
          </span>
          <span className="mt-0.5 block text-[10px] leading-4 text-muted">
            Save an address so future orders are faster.
          </span>
        </span>
        <IconPlus size={15} className="ml-auto shrink-0 text-muted" />
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
          Saved addresses
        </p>

        <button
          type="button"
          onClick={() => setShowManager(true)}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:text-primary-hover"
        >
          <IconPlus size={13} />
          Manage
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map((address) => {
          const selected = address.id === selectedId;

          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onChange(address)}
              className={`relative min-w-0 rounded-xl border p-3 text-left transition-all ${
                selected
                  ? "border-primary/50 bg-primary/[0.05] shadow-[0_0_20px_rgba(139,92,246,0.06)]"
                  : "border-border bg-surface/30 hover:border-primary/30 hover:bg-surface/60"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-primary text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {selected ? <IconCheck size={14} /> : <IconMapPin size={14} />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-foreground">
                      {address.label || "Address"}
                    </span>
                    {address.isDefault && (
                      <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-[0.08em] text-primary">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[10px] font-medium text-foreground">
                    {address.fullName}
                  </p>

                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-muted">
                    {address.addressLine1}, {address.city}, {address.state} {address.postalCode}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-muted">
        {selectedId
          ? "Selected address will be used for this order."
          : "Choose an address for this order."}
      </p>
    </div>
  );
}
