"use client";

import { useState } from "react";

import { IconMapPin, IconPlus } from "@tabler/icons-react";

import { AddressManager } from "@/components/account/AddressManager";
import { useAddresses, type Address } from "@/context/AddressContext";

interface AddressSelectorProps {
  value: string | null;
  onChange: (address: Address | null) => void;
}

export function AddressSelector({ value, onChange }: AddressSelectorProps) {
  const { addresses, defaultAddressId } = useAddresses();
  const [showManager, setShowManager] = useState(false);

  const selectedId = value ?? defaultAddressId;
  const selected = addresses.find((address) => address.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
          Saved addresses
        </p>
        <button
          type="button"
          onClick={() => setShowManager((current) => !current)}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:text-primary-hover"
        >
          <IconPlus size={13} />
          {showManager ? "Close" : "Manage addresses"}
        </button>
      </div>

      {showManager ? (
        <AddressManager
          selectMode
          selectedAddressId={selectedId}
          onSelect={(address) => {
            onChange(address);
            setShowManager(false);
          }}
        />
      ) : addresses.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowManager(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-surface/30 p-4 text-left hover:border-primary/40"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconMapPin size={16} />
          </span>
          <span>
            <span className="block text-xs font-medium text-foreground">Add a delivery address</span>
            <span className="mt-0.5 block text-[10px] text-muted">Choose where this order should be delivered.</span>
          </span>
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {addresses.map((address) => {
            const selectedAddress = address.id === selectedId;

            return (
              <button
                key={address.id}
                type="button"
                onClick={() => onChange(address)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedAddress
                    ? "border-primary/50 bg-primary/[0.05]"
                    : "border-border bg-surface/30 hover:border-primary/30"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <IconMapPin size={14} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-foreground">{address.fullName}</span>
                      {selectedAddress && (
                        <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-[0.08em] text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                      {address.addressLine1}, {address.city}, {address.state} {address.postalCode}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && !showManager && (
        <p className="text-[9px] text-muted">
          Delivering to {selected.city}, {selected.state}.
        </p>
      )}
    </div>
  );
}
