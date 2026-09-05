"use client";

import { useState } from "react";
import {
  IconCheck,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { useAddresses, type Address } from "@/context/AddressContext";

interface AddressManagerProps {
  selectMode?: boolean;
  selectedAddressId?: string | null;
  onSelect?: (address: Address) => void;
}

interface FormState {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  label: "Home",
  isDefault: false,
};

export function AddressManager({
  selectMode = false,
  selectedAddressId = null,
  onSelect,
}: AddressManagerProps) {
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    });
    setIsAdding(true);
  };

  const openEdit = (address: Address) => {
    setIsAdding(false);
    setEditingId(address.id);
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      label: address.label ?? "Home",
      isDefault: address.isDefault,
    });
  };

  const closeForm = () => {
    setEditingId(null);
    setIsAdding(false);
    setForm(EMPTY_FORM);
  };

  const update = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingId) {
      updateAddress(editingId, form);
    } else {
      addAddress(form);
    }

    closeForm();
  };

  const hasForm = isAdding || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Saved addresses
          </p>
          <p className="mt-1 text-xs text-muted">
            Use a default address for faster checkout.
          </p>
        </div>

        {!hasForm && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white hover:bg-primary-hover"
          >
            <IconPlus size={14} />
            <span className="hidden sm:inline">Add address</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {hasForm && (
        <AddressForm
          form={form}
          editing={editingId !== null}
          onChange={update}
          onSubmit={submit}
          onCancel={closeForm}
        />
      )}

      {addresses.length === 0 && !hasForm ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-5 py-10 text-center">
          <IconMapPin size={22} className="mx-auto text-muted" />
          <p className="mt-3 text-sm font-medium text-foreground">No saved addresses</p>
          <p className="mt-1 text-xs text-muted">Add an address so checkout is faster next time.</p>
          <button type="button" onClick={openAdd} className="mt-4 rounded-full border border-primary/40 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10">
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {addresses.map((address) => {
            const selected = selectedAddressId === address.id;

            return (
              <article
                key={address.id}
                className={`rounded-xl border p-3.5 transition-colors sm:p-4 ${
                  selected
                    ? "border-primary/50 bg-primary/[0.05]"
                    : "border-border bg-surface/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconMapPin size={15} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-medium text-foreground">{address.fullName}</h3>
                        {address.label && (
                          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] text-muted">
                            {address.label}
                          </span>
                        )}
                        {address.isDefault && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}
                        <br />
                        {address.city}, {address.state} {address.postalCode}
                        <br />
                        {address.country}
                      </p>
                      <p className="mt-2 text-[10px] text-muted">{address.phone}</p>
                    </div>
                  </div>

                  {!selectMode && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => openEdit(address)} aria-label={`Edit ${address.fullName} address`} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground">
                        <IconPencil size={14} />
                      </button>
                      <button type="button" onClick={() => deleteAddress(address.id)} aria-label={`Delete ${address.fullName} address`} disabled={address.isDefault && addresses.length === 1} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30">
                        <IconTrash size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={() => onSelect?.(address)}
                      className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full text-xs font-medium ${selected ? "bg-primary text-white" : "border border-border text-foreground hover:border-primary/50"}`}
                    >
                      {selected && <IconCheck size={14} />}
                      {selected ? "Selected" : "Use this address"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(address.id)}
                      disabled={address.isDefault}
                      className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted hover:text-primary disabled:cursor-default disabled:text-primary/70"
                    >
                      {address.isDefault ? "Default shipping address" : "Make default"}
                    </button>
                  )}

                  {selectMode && address.isDefault && !selected && (
                    <span className="text-[9px] uppercase tracking-[0.08em] text-muted">Default</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddressForm({
  form,
  editing,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  editing: boolean;
  onChange: (field: keyof FormState, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{editing ? "Edit address" : "Add address"}</h2>
          <p className="mt-1 text-[10px] text-muted">Used for physical order delivery.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close address form" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground">
          <IconX size={15} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full name" value={form.fullName} onChange={(value) => onChange("fullName", value)} required />
        <Input label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} required />
        <Input label="Address line 1" value={form.addressLine1} onChange={(value) => onChange("addressLine1", value)} required className="sm:col-span-2" />
        <Input label="Address line 2" value={form.addressLine2} onChange={(value) => onChange("addressLine2", value)} />
        <Input label="City" value={form.city} onChange={(value) => onChange("city", value)} required />
        <Input label="State" value={form.state} onChange={(value) => onChange("state", value)} required />
        <Input label="Postal code" value={form.postalCode} onChange={(value) => onChange("postalCode", value)} required />
        <Input label="Country" value={form.country} onChange={(value) => onChange("country", value)} required />
        <Input label="Label" value={form.label} onChange={(value) => onChange("label", value)} placeholder="Home, Work..." />
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted">
          <input type="checkbox" checked={form.isDefault} onChange={(event) => onChange("isDefault", event.target.checked)} className="accent-[var(--primary)]" />
          Make this my default address
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-full border border-border text-xs font-medium text-foreground hover:bg-surface-elevated">Cancel</button>
        <button type="submit" className="min-h-10 rounded-full bg-primary text-xs font-medium text-white hover:bg-primary-hover">{editing ? "Save changes" : "Add address"}</button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-medium uppercase tracking-[0.13em] text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background/60 px-3 text-xs text-foreground outline-none placeholder:text-muted/50 focus:border-primary/60"
      />
    </label>
  );
}