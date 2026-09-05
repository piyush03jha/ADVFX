"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconCheck,
  IconChevronDown,
  IconMail,
  IconPhone,
} from "@tabler/icons-react";

import { COUNTRIES, type CountryCode } from "@/config/countries";
import { SavedAddressSelector } from "@/components/checkout/SavedAddressSelector";
import { Button } from "@/components/ui/Button";
import { useAddresses, type Address } from "@/context/AddressContext";

interface CheckoutFormProps {
  onCountryChange?: (country: CountryCode) => void;
}

interface FormState {
  email: string;
  phone: string;
}

export interface CheckoutDraft {
  email: string;
  phone: string;
  addressId: string;
  address: Address;
  country: CountryCode;
}

const INITIAL_FORM: FormState = {
  email: "",
  phone: "",
};

const DRAFT_KEY = "forma-checkout-draft";

export function CheckoutForm({
  onCountryChange,
}: CheckoutFormProps) {
  const router = useRouter();
  const { addresses, defaultAddressId, isLoaded } = useAddresses();

  const [country, setCountry] =
    useState<CountryCode>("IN");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(defaultAddressId);
  const [saving, setSaving] = useState(false);

  const selectedAddress = useMemo(
    () =>
      addresses.find(
        (address) => address.id === selectedAddressId,
      ) ?? null,
    [addresses, selectedAddressId],
  );

  const selectedCountry = useMemo(
    () =>
      COUNTRIES.find((item) => item.code === country) ??
      COUNTRIES[0],
    [country],
  );

  const update = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCountry = (value: CountryCode) => {
    setCountry(value);
    onCountryChange?.(value);
  };

  const handleAddressChange = (address: Address | null) => {
    setSelectedAddressId(address?.id ?? null);

    if (address) {
      const countryEntry = COUNTRIES.find(
        (item) =>
          item.name.toLowerCase() ===
          address.country.toLowerCase(),
      );

      if (countryEntry) {
        setCountry(countryEntry.code);
        onCountryChange?.(countryEntry.code);
      }

      setForm((current) => ({
        ...current,
        phone: current.phone || address.phone,
      }));
    }
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedAddress) {
      return;
    }

    setSaving(true);

    const draft: CheckoutDraft = {
      ...form,
      addressId: selectedAddress.id,
      address: selectedAddress,
      country,
    };

    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft),
    );

    router.push("/payment");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 sm:space-y-6"
    >
      {/* ==================================================
          CONTACT
      ================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-white/[0.015]
          p-4
          sm:p-6
        "
      >
        <SectionHeading
          number="01"
          title="Contact information"
          description="We'll use this for order confirmation and delivery updates."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Email address"
            icon={<IconMail size={15} />}
            type="email"
            value={form.email}
            onChange={(value) =>
              update("email", value)
            }
            placeholder="you@example.com"
            required
          />

          <Field
            label="Phone number"
            icon={<IconPhone size={15} />}
            type="tel"
            value={form.phone}
            onChange={(value) =>
              update("phone", value)
            }
            placeholder="Your phone number"
            required
          />
        </div>
      </section>

      {/* ==================================================
          SAVED ADDRESS
      ================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-white/[0.015]
          p-4
          sm:p-6
        "
      >
        <SectionHeading
          number="02"
          title="Delivery address"
          description={
            isLoaded && addresses.length > 0
              ? "Choose where this order should be delivered. Your default address is selected automatically."
              : "Add a delivery address for this order."
          }
        />

        <div className="mt-5">
          <SavedAddressSelector
            value={selectedAddressId}
            onChange={handleAddressChange}
          />
        </div>

        {/* Country / currency follows selected address */}

        {selectedAddress && (
          <div
            className="
              mt-4
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-primary/15
              bg-primary/[0.035]
              p-3.5
              sm:p-4
            "
          >
            <IconCheck
              size={15}
              className="mt-0.5 shrink-0 text-primary"
            />

            <p className="text-[11px] leading-5 text-muted">
              Delivering to{" "}
              <span className="text-foreground">
                {selectedAddress.city},{" "}
                {selectedAddress.state}
              </span>
              {" · "}
              Currency:{" "}
              <span className="text-foreground">
                {selectedCountry.currency}
              </span>
            </p>
          </div>
        )}

        {/* Country fallback for an address saved before country mapping */}

        {!selectedAddress && (
          <SelectField
            label="Country / region"
            value={country}
            onChange={(value) =>
              handleCountry(value as CountryCode)
            }
            options={COUNTRIES.map((item) => ({
              value: item.code,
              label: item.name,
            }))}
          />
        )}
      </section>

      {/* ==================================================
          REVIEW & PAYMENT
      ================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-white/[0.015]
          p-4
          sm:p-6
        "
      >
        <SectionHeading
          number="03"
          title="Review & payment"
          description="Review the selected delivery address before entering payment information."
        />

        {selectedAddress && (
          <div
            className="
              mt-5
              rounded-xl
              border
              border-white/[0.07]
              bg-black/10
              p-3.5
              sm:p-4
            "
          >
            <p className="text-[9px] uppercase tracking-[0.15em] text-muted">
              Delivering to
            </p>

            <p className="mt-1 text-xs font-medium text-foreground">
              {selectedAddress.fullName}
            </p>

            <p className="mt-0.5 text-[10px] leading-4 text-muted">
              {selectedAddress.addressLine1}
              {selectedAddress.addressLine2
                ? `, ${selectedAddress.addressLine2}`
                : ""}
              , {selectedAddress.city},{" "}
              {selectedAddress.state} {selectedAddress.postalCode}
            </p>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              className="mt-2 text-[9px] font-medium text-primary hover:text-primary-hover"
            >
              Change address
            </button>
          </div>
        )}

        <div
          className="
            mt-5
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-white/[0.07]
            bg-black/10
            p-3.5
            sm:p-4
          "
        >
          <IconCheck
            size={16}
            className="mt-0.5 shrink-0 text-primary"
          />

          <div>
            <p className="text-xs font-medium text-foreground">
              Your payment is protected
            </p>

            <p className="mt-1 text-[11px] leading-5 text-muted">
              You'll review the final amount and choose
              a payment method on the secure payment step.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={saving || !selectedAddress || !isLoaded}
          className="mt-4 w-full"
        >
          {saving
            ? "Opening payment…"
            : selectedAddress
              ? "Continue to payment"
              : "Select a delivery address"}
        </Button>
      </section>
    </form>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3.5">
      <span className="pt-0.5 font-mono text-[10px] tracking-[0.15em] text-primary">
        {number}
      </span>

      <div className="min-w-0">
        <h2 className="text-base font-medium tracking-[-0.02em] text-foreground sm:text-xl">
          {title}
        </h2>

        <p className="mt-1.5 max-w-xl text-xs leading-5 text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </span>

      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          required={required}
          className={`
            h-11
            w-full
            min-w-0
            rounded-xl
            border
            border-white/[0.09]
            bg-black/10
            px-4
            text-sm
            text-foreground
            outline-none
            transition-colors
            placeholder:text-muted/50
            focus:border-primary/60
            ${icon ? "pl-11" : ""}
          `}
        />
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="
            h-11
            w-full
            appearance-none
            rounded-xl
            border
            border-white/[0.09]
            bg-black/10
            px-4
            pr-10
            text-sm
            text-foreground
            outline-none
            transition-colors
            focus:border-primary/60
          "
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#111113] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}