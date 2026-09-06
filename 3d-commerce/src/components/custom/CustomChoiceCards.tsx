"use client";

import { IconCheck, IconUser } from "@tabler/icons-react";

interface VisualOption {
  id: string;
  label: string;
  description: string;
  priceLabel: string;
  image: string;
}

export function VisualChoice({
  title,
  helper,
  options,
  value,
  onChange,
}: {
  title: string;
  helper: string;
  options: VisualOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-[10px] uppercase tracking-[0.12em] text-primary">Choose one</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`group relative overflow-hidden rounded-[22px] border text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                selected
                  ? "border-primary/70 bg-primary/[0.07] shadow-[0_18px_50px_rgba(139,92,246,0.1)]"
                  : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-white/15"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black/25 sm:aspect-[5/4]">
                <img src={option.image} alt="" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-white/20 bg-black/35 text-transparent"}`}>
                  <IconCheck size={13} />
                </span>
                <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] font-medium text-white backdrop-blur-md sm:text-[10px]">
                  {option.priceLabel}
                </span>
              </div>
              <div className="p-3.5 sm:p-4">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted sm:text-xs">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface IconOption {
  id: string;
  label: string;
  description: string;
  priceLabel: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
}

export function ChoiceGrid({
  title,
  helper,
  options,
  value,
  onChange,
}: {
  title: string;
  helper: string;
  options: IconOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-[10px] uppercase tracking-[0.12em] text-primary">Choose one</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {options.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon ?? IconUser;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`min-h-[142px] rounded-2xl border p-4 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${selected ? "border-primary/65 bg-primary/[0.075] shadow-[0_14px_40px_rgba(139,92,246,0.08)]" : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-white/15"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-primary"><Icon size={17} /></span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><IconCheck size={12} /></span>
              </div>
              <p className="mt-3 text-sm font-medium">{option.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">{option.description}</p>
              <p className="mt-2 text-[11px] font-medium text-primary">{option.priceLabel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
