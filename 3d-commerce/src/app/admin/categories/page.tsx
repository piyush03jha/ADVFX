"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  IconEdit,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconX,
  IconFileSpreadsheet,
} from "@tabler/icons-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Category[];
  _count?: { products: number };
};

const empty = {
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  parentId: "",
  isActive: true,
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"create" | "upsert">("upsert");
  const [importBusy, setImportBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<{ rows: Array<Record<string, string>>; summary?: Record<string, number | string>; errors?: Array<{ row: number; message: string }> } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const createImageRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/categories", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to load categories");
      setCategories(Array.isArray(d) ? d : []);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(c: Category) {
    setEditing(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      sortOrder: String(c.sortOrder ?? 0),
      parentId: c.parentId ?? "",
      isActive: c.isActive,
    });
  }

  function reset() {
    setEditing(null);
    setForm(empty);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        parentId: form.parentId || null,
        isActive: form.isActive,
      };

      const r = await fetch(
        editing ? "/api/categories/" + editing : "/api/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(d?.message || d?.error || "Category save failed");
      }

      let savedCategoryId = editing;
      if (!editing && d?.id) savedCategoryId = d.id;

      if (createImageFile && savedCategoryId) {
        await uploadImage(savedCategoryId, createImageFile);
      }

      setMessage(editing ? "Category updated." : "Category created.");
      setCreateImageFile(null);
      if (createImageRef.current) createImageRef.current.value = "";
      reset();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Category save failed");
    } finally {
      setSaving(false);
    }
  }


  const parentCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  function normalizeHeader(value: string) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += char;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((value) => value.trim() !== ""));
  }

  async function readImportFile(file: File) {
    const text = await file.text();
    const raw = parseCsv(text);
    if (raw.length < 2) throw new Error("The CSV needs a header and at least one data row.");
    const headers = raw[0].map(normalizeHeader);
    const aliases: Record<string, string[]> = {
      category_name: ["category_name", "main_category", "parent_category", "category"],
      category_slug: ["category_slug", "main_category_slug", "parent_slug", "slug"],
      subcategory_name: ["subcategory_name", "sub_category", "sub_category_name", "child_category"],
      subcategory_slug: ["subcategory_slug", "sub_category_slug", "child_slug"],
      rank: ["rank", "sort_order", "category_rank", "display_order", "subcategory_rank"],
      description: ["description", "category_description"],
      is_active: ["is_active", "active", "status"],
    };
    const indexFor = (key: string) => headers.findIndex((h) => aliases[key].includes(h));
    const categoryNameIndex = indexFor("category_name");
    const categorySlugIndex = indexFor("category_slug");
    if (categoryNameIndex < 0 || categorySlugIndex < 0) {
      throw new Error("Required headers: category_name and category_slug. Add optional subcategory_name, subcategory_slug, rank, description and is_active.");
    }
    return raw.slice(1).map((row, idx) => {
      const value = (key: string) => {
        const column = indexFor(key);
        return column < 0 ? "" : (row[column] ?? "").trim();
      };
      const activeValue = value("is_active").toLowerCase();
      return {
        category_name: row[categoryNameIndex]?.trim() ?? "",
        category_slug: row[categorySlugIndex]?.trim().toLowerCase() ?? "",
        subcategory_name: value("subcategory_name"),
        subcategory_slug: value("subcategory_slug").toLowerCase(),
        rank: value("rank") === "" ? idx : Number(value("rank")),
        description: value("description"),
        is_active: activeValue === "" ? true : ["true", "1", "yes", "active"].includes(activeValue),
      };
    });
  }

  async function previewImport(file = importFile) {
    if (!file) { setMessage("Choose a CSV spreadsheet first."); return; }
    setImportBusy(true); setMessage(""); setImportPreview(null);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error("For reliable import, export the Excel workbook as CSV UTF-8 (.csv) and upload it here.");
      }
      const rows = await readImportFile(file);
      const response = await fetch("/api/categories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode: importMode, dryRun: true }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || data?.error || "Could not validate spreadsheet.");
      setImportPreview({ rows: rows as unknown as Array<Record<string, string>>, summary: data.summary, errors: data.errors ?? [] });
      setMessage(data.ok ? "Validation passed. Review the counts, then confirm to import." : "Fix the listed rows and upload again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to preview file.");
    } finally { setImportBusy(false); }
  }

  async function confirmImport() {
    if (!importFile) return;
    setImportBusy(true); setMessage("");
    try {
      const rows = await readImportFile(importFile);
      const response = await fetch("/api/categories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode: importMode, dryRun: false }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.message || data?.error || data?.errors?.[0]?.message || "Import failed. No changes were saved.");
      setMessage(`Import finished. Created ${data.summary.created}, updated ${data.summary.updated}. Images can be added later.`);
      setImportPreview(null); setImportFile(null);
      if (importRef.current) importRef.current.value = "";
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Category import failed.");
    } finally { setImportBusy(false); }
  }

  function downloadTemplate() {
    const csv = [
      "category_name,category_slug,subcategory_name,subcategory_slug,rank,description,is_active",
      "Miniatures,miniatures,Characters,miniature-characters,1,,true",
      "Miniatures,miniatures,Animals,miniature-animals,2,,true",
      "Miniatures,miniatures,Vehicles,miniature-vehicles,3,,true",
      "Accessories,accessories,,,,,true",
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href; link.download = "voxel3d-category-import-template.csv"; link.click();
    URL.revokeObjectURL(href);
  }

  async function uploadImage(id: string, file: File | undefined) {
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setMessage("Use JPG, PNG or WebP for category images.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Category image must be 5 MB or smaller.");
      return;
    }

    setUploadingId(id);
    setMessage("");

    try {
      const body = new FormData();
      body.append("file", file);

      const r = await fetch("/api/categories/" + id + "/image", {
        method: "POST",
        body,
      });

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(
          d?.message || d?.error || "Category image upload failed",
        );
      }

      setMessage("Category image updated.");
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Category image upload failed",
      );
    } finally {
      setUploadingId(null);
      const input = fileRefs.current[id];
      if (input) input.value = "";
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm('Deactivate "' + name + '"? Products using it will remain.')) {
      return;
    }

    setSaving(true);

    try {
      const r = await fetch("/api/categories/" + id, { method: "DELETE" });
      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(d?.message || "Unable to deactivate category");
      }

      setMessage("Category deactivated.");
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to deactivate category",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">
            Catalog
          </p>
          <h1 className="mt-2 font-serif text-4xl">Categories</h1>
          <p className="mt-2 text-sm text-muted">
            Create, edit, order, image and deactivate product categories.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-xl border border-border p-2 text-muted"
          aria-label="Refresh"
        >
          <IconRefresh size={16} />
        </button>
        <button type="button" onClick={downloadTemplate} className="rounded-xl border border-border px-3 py-2 text-xs">Download CSV template</button>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><IconFileSpreadsheet size={18} className="text-primary" /> Bulk import categories</p>
            <p className="mt-1 text-xs text-muted">Upload one CSV for main categories and subcategories. Images are optional and can be added later.</p>
          </div>
          <select value={importMode} onChange={(e) => setImportMode(e.target.value as "create" | "upsert")} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
            <option value="upsert">Create or update by slug</option>
            <option value="create">Create only (reject existing slugs)</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={importRef} type="file" accept=".csv,text/csv" onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null); }} className="block max-w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2" />
          <button type="button" disabled={!importFile || importBusy} onClick={() => void previewImport()} className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50">{importBusy ? "Validating…" : "Validate & preview"}</button>
          {importPreview?.summary && <button type="button" disabled={importBusy || Boolean(importPreview.errors?.length)} onClick={() => void confirmImport()} className="rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{importBusy ? "Importing…" : "Confirm import"}</button>}
        </div>
        <p className="mt-2 text-[10px] text-muted">Expected columns: category_name, category_slug, subcategory_name, subcategory_slug, rank, description, is_active. Export Excel as CSV UTF-8 first.</p>
        {importPreview?.summary && <div className="mt-4 rounded-xl border border-border p-3 text-xs"><p className="font-semibold">Preview</p><p className="mt-1 text-muted">{Object.entries(importPreview.summary).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p></div>}
        {!!importPreview?.errors?.length && <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-red-500/30 p-3 text-xs text-red-300"><p className="font-semibold">{importPreview.errors.length} validation issue(s)</p>{importPreview.errors.slice(0, 100).map((error, index) => <p key={index} className="mt-1">Row {error.row}: {error.message}</p>)}</div>}
      </section>

      <form
        onSubmit={save}
        className="mt-7 rounded-2xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <IconPlus size={16} className="text-primary" />
            {editing ? "Edit category" : "Create category"}
          </div>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg p-1.5 text-muted"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Category name"
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
          />
          <input
            required
            maxLength={160}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value.toLowerCase() })
            }
            placeholder="slug (e.g. ocean-life)"
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
          />
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            placeholder="Sort order"
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
          />
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
          >
            <option value="">Main category (no parent)</option>
            {parentCategories.filter((category) => category.id !== editing).map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <textarea
            maxLength={1000}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Description (optional)"
            className="min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs"
          />

          {!editing && (
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">Category image</p>
                  <p className="mt-1 text-[10px] text-muted">
                    JPG, PNG or WebP · max 5 MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => createImageRef.current?.click()}
                  className="rounded-lg border border-border px-3 py-2 text-[10px] font-medium"
                >
                  {createImageFile ? "Change image" : "Choose image"}
                </button>
              </div>
              <input
                ref={createImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setCreateImageFile(file);
                }}
              />
              {createImageFile && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(createImageFile)}
                    alt="Selected category"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <p className="truncate text-[10px] text-muted">
                    {createImageFile.name}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.checked })
            }
          />
          Active category
        </label>

        <button
          disabled={saving}
          className="mt-4 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Create category"}
        </button>

        {message && <p className="mt-3 text-xs text-muted">{message}</p>}
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
          ))
        ) : (
          categories.map((c) => (
            <article
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                  {c.imageUrl ? (
                    <img
                      src={resolveMediaUrl(c.imageUrl) ?? ""}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <IconPhoto size={22} stroke={1.4} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{c.parent ? c.parent.name + " / " : ""}{c.name}</p>
                    <span
                      className={
                        c.isActive
                          ? "rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary"
                          : "rounded-full bg-muted/10 px-2 py-1 text-[9px] text-muted"
                      }
                    >
                      {c.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {c.slug} · order {c.sortOrder} · {c._count?.products ?? 0} products{c.parentId ? " · Subcategory" : " · Main category"}
                  </p>
                  {c.description && (
                    <p className="mt-1 max-w-2xl text-[10px] text-muted">
                      {c.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    fileRefs.current[c.id] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    void uploadImage(c.id, e.target.files?.[0])
                  }
                />

                <button
                  type="button"
                  onClick={() => fileRefs.current[c.id]?.click()}
                  disabled={saving || uploadingId === c.id}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-medium text-muted"
                  title="Change category image"
                >
                  {uploadingId === c.id ? (
                    "Uploading…"
                  ) : (
                    <>
                      <IconUpload size={14} />
                      Change image
                    </>
                  )}
                </button>

                <button
                  onClick={() => startEdit(c)}
                  disabled={saving || uploadingId === c.id}
                  className="rounded-lg border border-border p-2 text-muted"
                  title="Edit category"
                >
                  <IconEdit size={15} />
                </button>

                {c.isActive && (
                  <button
                    onClick={() => void remove(c.id, c.name)}
                    disabled={saving || uploadingId === c.id}
                    className="rounded-lg border border-red-400/20 p-2 text-red-300"
                    title="Deactivate category"
                  >
                    <IconTrash size={15} />
                  </button>
                )}
              </div>
            </article>
          ))
        )}

        {!loading && !categories.length && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">
            No categories yet.
          </div>
        )}
      </div>
    </main>
  );
}
