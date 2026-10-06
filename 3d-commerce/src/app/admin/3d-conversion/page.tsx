"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconBox,
  IconCheck,
  IconDownload,
  IconRefresh,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import {
  AdminButton,
  AdminCard,
  AdminPage,
  AdminTable,
  AdminTableHeader,
} from "@/components/admin/AdminKit";
import { uploadConversionDirect } from "@/lib/conversion-upload";

type Product = {
  id: string;
  name: string;
  files?: Array<{
    id: string;
    originalName: string;
    fileSize: string;
  }>;
};

type AttachProduct = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

type Job = {
  id: string;
  originalName: string;
  inputExt: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  stage: string;
  attempts: number;
  maxAttempts: number;
  originalSize: string | null;
  convertedSize: string | null;
  outputSize: string | null;
  targetProductId: string | null;
  publishedFileId: string | null;
  optimizationPreset: "BALANCED" | "SMALLEST";
  optimizerWarning: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  publishedAt: string | null;
};

const ACCEPT = ".abc,.usd,.usda,.usdc,.usdz,.svg,.pdf,.obj,.ply,.stl,.bvh,.fbx,.glb,.gltf";
const FORMATS = [
  "Alembic (.abc)",
  "Universal Scene Description (.usd*)",
  "Grease Pencil as SVG (.svg)",
  "Grease Pencil as PDF (.pdf)",
  "Wavefront (.obj)",
  "Stanford PLY (.ply)",
  "STL (.stl)",
  "Motion Capture (.bvh)",
  "FBX (.fbx)",
  "glTF 2.0 (.glb/.gltf)",
];

function sizeLabel(value: string | null) {
  if (!value) return "—";
  const mb = Number(value) / 1024 / 1024;
  return mb >= 10 ? mb.toFixed(1) + " MB" : mb.toFixed(2) + " MB";
}

export default function ThreeDConversionPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [targetProductId, setTargetProductId] = useState("");
  const [existingProductId, setExistingProductId] = useState("");
  const [preset, setPreset] = useState<"BALANCED" | "SMALLEST">("BALANCED");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const loadingRef = useRef(false);

  async function loadJobs() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const response = await fetch("/api/3d-conversion", { cache: "no-store" });
      if (response.ok) setJobs(await response.json());
    } finally {
      loadingRef.current = false;
    }
  }

  async function loadProducts() {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    }
  }

  async function load() {
    await Promise.all([loadJobs(), loadProducts()]);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadJobs();
    }, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(file: File) {
    if (uploading) return;
    setMessage("");
    setUploading(true);
    setProgress(0);

    try {
      await uploadConversionDirect(file, setProgress, undefined, {
        targetProductId: targetProductId || undefined,
        optimizationPreset: preset,
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  async function retry(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/3d-conversion/" + encodeURIComponent(id) + "/retry", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? "Retry failed");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this conversion job and its conversion-owned storage files?")) return;
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/3d-conversion/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? "Delete failed");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  async function rerun(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/3d-conversion/" + encodeURIComponent(id) + "/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optimizationPreset: preset }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? data?.error ?? "Re-run failed");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-run failed");
    } finally {
      setBusy("");
    }
  }

  async function publish(id: string, productId: string) {
    setBusy(id);
    try {
      const response = await fetch("/api/3d-conversion/" + encodeURIComponent(id) + "/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? data?.error ?? "Publish failed");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setBusy("");
    }
  }
  async function openAttach(id: string) {
    setAttachJobId(id);
    setAttachProductId("");
    setMessage("");
    setLoadingAttachProducts(true);
    try {
      const response = await fetch("/api/3d-conversion/products-without-model", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? "Unable to load products");
      }
      const nextProducts = Array.isArray(data) ? data : [];
      setAttachProducts(nextProducts);
      if (nextProducts.length === 0) {
        setMessage("No products without a 3D model are available.");
      }
    } catch (error) {
      setAttachJobId("");
      setMessage(error instanceof Error ? error.message : "Unable to load products");
    } finally {
      setLoadingAttachProducts(false);
    }
  }

  function closeAttach() {
    setAttachJobId("");
    setAttachProducts([]);
    setAttachProductId("");
  }

  async function attachSelected() {
    if (!attachJobId || !attachProductId) return;
    await publish(attachJobId, attachProductId);
    closeAttach();
  }


  async function optimizeExisting() {
    const product = products.find((item) => item.id === existingProductId);
    const file = product?.files?.[0];
    if (!product || !file) {
      setMessage("Select a product that already has a GLB model.");
      return;
    }

    setBusy("existing:" + product.id);
    setMessage("");
    try {
      const response = await fetch("/api/3d-conversion/existing-glb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productFileId: file.id,
          optimizationPreset: preset,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? data?.error ?? "Unable to create optimization job");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create optimization job");
    } finally {
      setBusy("");
    }
  }

  function download(id: string, kind: "optimized" | "converted") {
    window.location.href =
      "/api/3d-conversion/" +
      encodeURIComponent(id) +
      (kind === "converted" ? "/download-converted" : "/download");
  }

  return (
    <AdminPage
      title="3D Conversion"
      eyebrow="Admin utility"
      description="Convert source assets into web-optimized GLB files. Optimized assets use Meshopt + WebP and are labelled as web-optimized."
    >
      <AdminCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Attach when ready
            <select
              value={targetProductId}
              onChange={(event) => setTargetProductId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Do not attach automatically</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium">
            Optimization preset
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as "BALANCED" | "SMALLEST")}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="BALANCED">Balanced — preferred max ~8 MB</option>
              <option value="SMALLEST">Smallest — stronger size reduction</option>
            </select>
          </label>
        </div>

        <div
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={
            "mt-5 rounded-3xl border-2 border-dashed p-8 text-center transition sm:p-12 " +
            (dragging ? "border-primary bg-primary/[0.05]" : "border-border bg-background")
          }
        >
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={choose} className="sr-only" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconBox size={28} stroke={1.6} />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Drop a 3D file here</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
            Upload one source at a time. GLB inputs skip Blender and go directly through the web optimization pipeline.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {FORMATS.map((format) => (
              <span key={format} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-muted">{format}</span>
            ))}
          </div>
          <AdminButton className="mt-7" variant="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <IconUpload size={16} />
            {uploading ? "Uploading " + progress + "%" : "Choose file"}
          </AdminButton>
          {uploading ? (
            <div className="mx-auto mt-5 h-1.5 max-w-md overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: progress + "%" }} />
            </div>
          ) : null}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Optimize existing GLB</h2>
            <p className="mt-1 text-xs text-muted">
              Reprocess an existing product model without downloading and re-uploading it.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[360px] sm:flex-row">
            <select
              value={existingProductId}
              onChange={(event) => setExistingProductId(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select product</option>
              {products.filter((product) => product.files?.[0]).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {sizeLabel(product.files?.[0]?.fileSize ?? null)}
                </option>
              ))}
            </select>
            <AdminButton
              variant="primary"
              onClick={() => void optimizeExisting()}
              disabled={!existingProductId || busy.startsWith("existing:")}
            >
              <IconRefresh size={15} /> Optimize
            </AdminButton>
          </div>
        </div>
        {message ? <p className="mt-4 text-xs text-red-600">{message}</p> : null}
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Conversion jobs</h2>
            <p className="mt-1 text-xs text-muted">Jobs refresh automatically while the worker is online.</p>
          </div>
          <AdminButton onClick={() => void load()}><IconRefresh size={15} />Refresh</AdminButton>
        </div>

        <AdminTable>
          <AdminTableHeader>
            <th className="p-3">Source</th>
            <th className="p-3">Stage</th>
            <th className="p-3">Size</th>
            <th className="p-3">Result</th>
            <th className="p-3">Actions</th>
          </AdminTableHeader>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted">No conversion jobs yet.</td></tr>
            ) : jobs.map((job) => (
              <tr key={job.id} className="border-b border-border last:border-0">
                <td className="max-w-[260px] p-3">
                  <div className="flex items-center gap-2">
                    <IconBox size={16} className="shrink-0 text-muted" />
                    <span className="truncate font-medium">{job.originalName}</span>
                  </div>
                  <p className="mt-1 text-[10px] uppercase text-muted">{job.inputExt} · {job.optimizationPreset}</p>
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium">
                    {job.stage === "PUBLISHED" ? <IconCheck size={13} /> : job.stage === "FAILED" ? <IconAlertTriangle size={13} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                    {job.stage}
                  </span>
                  {job.optimizerWarning ? <p className="mt-2 max-w-sm text-[10px] text-amber-700">{job.optimizerWarning}</p> : null}
                  {job.errorMessage ? <p className="mt-2 max-w-sm text-[10px] text-red-600">{job.errorMessage}</p> : null}
                </td>
                <td className="p-3 text-xs text-muted">
                  {sizeLabel(job.originalSize)} → {sizeLabel(job.outputSize)}
                </td>
                <td className="p-3 text-xs text-muted">
                  {job.publishedFileId ? "Published to product" : job.status === "COMPLETED" ? "READY" : "—"}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {job.status === "COMPLETED" && job.stage === "READY" ? (
                      <>
                        <AdminButton onClick={() => void rerun(job.id)} disabled={busy === job.id}>
                          <IconRefresh size={15} /> Re-run {preset === "SMALLEST" ? "Smallest" : "Balanced"}
                        </AdminButton>
                        <AdminButton variant="primary" onClick={() => download(job.id, "optimized")}>
                          <IconDownload size={15} /> Web-optimized GLB
                        </AdminButton>
                        <AdminButton onClick={() => download(job.id, "converted")}>
                          <IconDownload size={15} /> Converted GLB
                        </AdminButton>
                        {!job.targetProductId ? (
                          <AdminButton
                            onClick={() => void openAttach(job.id)}
                            disabled={busy === job.id || loadingAttachProducts}
                          >
                            <IconCheck size={15} /> Attach to product
                          </AdminButton>
                        ) : null}
                      </>
                    ) : null}
                    {attachJobId === job.id ? (
                      <div className="mt-3 w-full rounded-xl border border-border bg-background p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={attachProductId}
                            onChange={(event) => setAttachProductId(event.target.value)}
                            disabled={loadingAttachProducts || busy === job.id}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">
                              {loadingAttachProducts ? "Loading products…" : "Select a product without a 3D model"}
                            </option>
                            {attachProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} · {product.status}
                              </option>
                            ))}
                          </select>
                          <AdminButton
                            variant="primary"
                            onClick={() => void attachSelected()}
                            disabled={!attachProductId || busy === job.id || loadingAttachProducts}
                          >
                            <IconCheck size={15} /> Connect
                          </AdminButton>
                          <AdminButton onClick={closeAttach} disabled={busy === job.id}>
                            Cancel
                          </AdminButton>
                        </div>
                        {!loadingAttachProducts && attachProducts.length === 0 ? (
                          <p className="mt-2 text-xs text-muted">Every product already has a 3D model.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {job.status === "FAILED" ? (
                      <AdminButton onClick={() => void retry(job.id)} disabled={busy === job.id}>
                        <IconRefresh size={15} /> Retry
                      </AdminButton>
                    ) : null}
                    <AdminButton onClick={() => void remove(job.id)} disabled={busy === job.id}>
                      <IconTrash size={15} /> Delete
                    </AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminCard>
    </AdminPage>
  );
}
