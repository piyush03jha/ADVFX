"use client";

import { IconArrowUpRight, IconCube } from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";

export interface ShopCategory {
  id: string;
  label: string;
  description: string;
  image: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "product", label: "Product Models", description: "Consumer products, devices & objects", image: "/categories/1.jpg" },
  { id: "electronics", label: "Electronics", description: "Tech, gadgets & digital hardware", image: "/categories/2.jpg" },
  { id: "furniture", label: "Furniture", description: "Interior, furniture & lifestyle", image: "/categories/3.jpg" },
  { id: "industrial", label: "Industrial", description: "Machinery, tools & engineering", image: "/categories/4.jpg" },
];

interface ShopCategoriesProps {
  selected: string;
  onChange: (category: string) => void;
}

export function ShopCategories({ selected, onChange }: ShopCategoriesProps: ShopCategoriesProps) {
  return (
    <section className="py-8 sm:py-10">
      <Container>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Browse by type</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">Explore categories</h2>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted sm:flex">
            <IconCube size={13} />
            3D Asset Library
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CategoryCard active={selected === "all"} image="/catogeries/1.jpg" label="All Models" description="Complete collection" onClick={() => onChange("all")} />
          {SHOP_CATEGORIES.map((category) => (
            <CategoryCard key={category.id} active={selected === category.id} image={category.image} label={category.label} description={category.description} onClick={() => onChange(category.id)} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function CategoryCard({ image, label, description, active, onClick }: {
  image: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[150px] overflow-hidden rounded-2xl border text-left transition-all duration-300 ${active ? "border-primary/70 ring-1 ring-primary/40" : "border-border/70 hover:border-primary/50"}`}
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-black/25" />

      <div className="relative z-10 flex h-full min-h-[150px] flex-col justify-end p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="inline-block max-w-full rounded-md bg-black px-2 py-1 text-sm font-semibold leading-5 text-white shadow-md">
              {label}
            </h3>
            <p className="mt-1 inline-block max-w-full rounded-md bg-black px-2 py-1 text-[10px] font-medium leading-4 text-white shadow-md">
              {description}
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/70 text-white shadow-sm backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/70 group-hover:bg-primary group-hover:text-white">
            <IconArrowUpRight size={15} stroke={2} />
          </span>
        </div>
      </div>
    </button>
  );
}
