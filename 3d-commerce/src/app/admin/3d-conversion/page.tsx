"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconBox,
  IconCheck,
  IconDownload,
  IconBox,
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

type Job = {
  id: string;
  originalName: string;
  inputExt: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  outputSize: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

const ACCEPT = ".abc,.usd,.usda,.usdc,.usdz,.fbx,.obj,.ply,.stl,.gltf";
const FORMATS = ["FBX", "OBJ", "STL", "PLY", "GLTF", "USD", "USDZ", "ABC"];

export default function ThreeDConversionPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch("/api/3d-conversion", { cache: "no-store" });
    if (response.ok) setJobs(await response.json());
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  async function upload(file: File) {
    if (uploading) return;
    setMessage("");
    setUploading(true);
    setProgress(0);
    try {
      await uploadConversionDirect(file, setProgress);
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
    try {
      await fetch("/api/3d-conversion/" + encodeURIComponent(id) + "/retry", { method: "POST" });
      await load();
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await fetch("/api/3d-conversion/" + encodeURIComponent(id), { method: "DELETE" });
      await load();
    } finally {
      setBusy("");
    }
  }

  function download(id: string) {
    window.location.href = "/api/3d-conversion/" + encodeURIComponent(id) + "/download";
  }

  return (
    <AdminPage
      title="3D Conversion"
      eyebrow="Admin utility"
      description="Convert source 3D assets into web-ready GLB files for internal use. Converted files are not exposed to storefront customers."
    >
      <AdminCard>
        <div
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={
            "rounded-3xl border-2 border-dashed p-8 text-center transition sm:p-12 " +
            (dragging ? "border-primary bg-primary/[0.05]" : "border-border bg-background")
          }
        >
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={choose} className="sr-only" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconBox size={28} stroke={1.6} />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Drop a 3D file here</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
            Upload a single source asset. For OBJ/GLTF/FBX files that reference external MTL, BIN or texture files, bundle support will be added separately; this first implementation keeps the upload path deterministic and safe.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {FORMATS.map((format) => (
              <span key={format} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-muted">
                {format}
              </span>
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
          {message ? (
            <p className="mx-auto mt-4 max-w-xl text-xs text-red-600">{message}</p>
          ) : null}
        </div>
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
            <th className="p-3">Status</th>
            <th className="p-3">Attempts</th>
            <th className="p-3">Created</th>
            <th className="p-3">Result</th>
            <th className="p-3">Actions</th>
          </AdminTableHeader>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted">No conversion jobs yet.</td></tr>
            ) : jobs.map((job) => (
              <tr key={job.id} className="border-b border-border last:border-0">
                <td className="max-w-[280px] p-3">
                  <div className="flex items-center gap-2">
                    <IconBox size={16} className="shrink-0 text-muted" />
                    <span className="truncate font-medium">{job.originalName}</span>
                  </div>
                  <p className="mt-1 text-[10px] uppercase text-muted">{job.inputExt}</p>
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium">
                    {job.status === "COMPLETED" ? <IconCheck size={13} /> : job.status === "FAILED" ? <IconAlertTriangle size={13} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                    {job.status}
                  </span>
                  {job.errorMessage ? <p className="mt-2 max-w-sm text-[10px] text-red-600">{job.errorMessage}</p> : null}
                </td>
                <td className="p-3 text-muted">{job.attempts}/{job.maxAttempts}</td>
                <td className="whitespace-nowrap p-3 text-muted">{new Date(job.createdAt).toLocaleString()}</td>
                <td className="p-3 text-muted">{job.outputSize ? Math.round(Number(job.outputSize) / 1024 / 1024) + " MB GLB" : "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {job.status === "COMPLETED" ? (
                      <AdminButton variant="primary" onClick={() => download(job.id)}><IconDownload size={15} />Download GLB</AdminButton>
                    ) : null}
                    {job.status === "FAILED" ? (
                      <AdminButton onClick={() => void retry(job.id)} disabled={busy === job.id}><IconRefresh size={15} />Retry</AdminButton>
                    ) : null}
                    <AdminButton onClick={() => void remove(job.id)} disabled={busy === job.id}><IconTrash size={15} />Delete</AdminButton>
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
