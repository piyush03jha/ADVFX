"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconRefresh } from "@tabler/icons-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
};

export default function AdminSeoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const next = (data.products ?? []) as Product[];
      setProducts(next);
      setDrafts(Object.fromEntries(next.map((product) => [product.id, product])));
      setMessage("");
    } catch {
      setMessage("Unable to load product SEO settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function update(id: string, field: keyof Product, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function save(product: Product) {
    const draft = drafts[product.id];
    if (!draft) return;
    setSaving(product.id);
    setMessage("");

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seoTitle: draft.seoTitle?.trim() || null,
          seoDescription: draft.seoDescription?.trim() || null,
          seoKeywords: draft.seoKeywords?.trim() || null,
          canonicalUrl: draft.canonicalUrl?.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? data?.error ?? "Unable to save SEO settings.");
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...draft } : item));
      setMessage(`Saved SEO for ${product.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save SEO settings.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Growth</p>
          <h1 className="mt-2 font-serif text-4xl">Product SEO</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            Control title, description, keywords and canonical URL metadata for product detail pages.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:text-foreground">
          <IconRefresh size={14} /> Refresh
        </button>
      </div>

      {message && <p className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">{message}</p>}

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-surface" />)}</div>
      ) : (
        <div className="mt-6 space-y-5">
          {products.map((product) => {
            const draft = drafts[product.id] ?? product;
            const titleLength = draft.seoTitle?.length ?? 0;
            const descriptionLength = draft.seoDescription?.length ?? 0;

            return (
              <section key={product.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 text-[10px] text-muted">/{product.slug} · {product.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void save(product)}
                    disabled={saving === product.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-[10px] font-semibold text-background disabled:opacity-50"
                  >
                    <IconCheck size={13} /> {saving === product.id ? "Saving…" : "Save SEO"}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted">SEO title · {titleLength}/70</span>
                    <input value={draft.seoTitle ?? ""} maxLength={70} onChange={(event) => update(product.id, "seoTitle", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
                  </label>
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Canonical URL</span>
                    <input value={draft.canonicalUrl ?? ""} maxLength={500} onChange={(event) => update(product.id, "canonicalUrl", event.target.value)} placeholder="https://example.com/product/slug" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Meta description · {descriptionLength}/160</span>
                    <textarea value={draft.seoDescription ?? ""} maxLength={160} onChange={(event) => update(product.id, "seoDescription", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 outline-none focus:border-primary" />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Keywords</span>
                    <input value={draft.seoKeywords ?? ""} maxLength={500} onChange={(event) => update(product.id, "seoKeywords", event.target.value)} placeholder="3d printed figurine, collectible, custom model" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
