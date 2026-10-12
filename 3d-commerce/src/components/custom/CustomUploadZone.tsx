"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { IconCube, IconPhoto, IconX } from "@tabler/icons-react";

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const MODEL_EXTENSIONS = [
  "glb", "gltf", "obj", "ply", "stl", "fbx", "bvh", "abc",
  "usd", "usda", "usdc", "usdz",
];
const MAX_IMAGES = 5;
const MAX_IMAGE_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_MODEL_BYTES = 100 * 1024 * 1024;

function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function CustomUploadZone({
  files,
  onFilesChange,
  modelFile,
  onModelFileChange,
  error,
  onErrorChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  modelFile: File | null;
  onModelFileChange: (file: File | null) => void;
  error: string;
  onErrorChange: (error: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function acceptImages(incoming: File[]) {
    const valid = incoming.filter((file) => IMAGE_TYPES.includes(file.type));
    if (valid.length !== incoming.length) {
      onErrorChange("Only JPG and PNG images are accepted.");
      return;
    }

    const next = [...files, ...valid];
    if (next.length > MAX_IMAGES) {
      onErrorChange("You can upload a maximum of 5 reference images.");
      return;
    }

    const totalBytes = next.reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_IMAGE_TOTAL_BYTES) {
      onErrorChange("All reference images together must be 50 MB or smaller.");
      return;
    }

    onErrorChange("");
    onFilesChange(next);
  }

  function acceptModel(file: File | undefined) {
    if (!file) return;

    const extension = extensionOf(file.name);
    if (!MODEL_EXTENSIONS.includes(extension)) {
      onErrorChange(
        "Unsupported 3D format. Use GLB, glTF, OBJ, PLY, STL, FBX, BVH, ABC, USD, USDA, USDC, or USDZ.",
      );
      return;
    }

    if (file.size > MAX_MODEL_BYTES) {
      onErrorChange("The 3D reference file must be 100 MB or smaller.");
      return;
    }

    onErrorChange("");
    onModelFileChange(file);
  }

  function handlePhotoInput(event: ChangeEvent<HTMLInputElement>) {
    acceptImages(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleModelInput(event: ChangeEvent<HTMLInputElement>) {
    acceptModel(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    const dropped = Array.from(event.dataTransfer.files ?? []);
    const images = dropped.filter((file) => IMAGE_TYPES.includes(file.type));
    const model = dropped.find((file) => MODEL_EXTENSIONS.includes(extensionOf(file.name)));

    if (images.length) acceptImages(images);
    if (model) acceptModel(model);

    if (!images.length && !model) {
      onErrorChange("Drop JPG/PNG images or a supported 3D file.");
    }
  }

  const imageTotalMb = files.reduce((total, file) => total + file.size, 0) / (1024 * 1024);

  return (
    <div>
      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={handlePhotoInput}
      />
      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,.gltf,.obj,.ply,.stl,.fbx,.bvh,.abc,.usd,.usda,.usdc,.usdz"
        className="sr-only"
        onChange={handleModelInput}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={
          "rounded-[24px] border border-dashed p-3 transition " +
          (dragActive
            ? "border-primary/70 bg-primary/[0.05]"
            : "border-border bg-background/25")
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left transition duration-300 hover:border-primary/55 hover:bg-primary/[0.035] sm:min-h-[150px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary transition group-hover:scale-105">
              <IconPhoto size={21} />
            </div>
            <div>
              <p className="text-sm font-medium">Upload reference photos</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                JPG or PNG · max 5 images · 50 MB total
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => modelInputRef.current?.click()}
            className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left transition duration-300 hover:border-primary/55 hover:bg-primary/[0.035] sm:min-h-[150px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary transition group-hover:scale-105">
              <IconCube size={21} />
            </div>
            <div>
              <p className="text-sm font-medium">Upload 3D reference</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                GLB, glTF, OBJ, STL, FBX and more · max 100 MB · 1 file
              </p>
            </div>
          </button>
        </div>

        <p className="mt-3 hidden text-center text-[10px] uppercase tracking-[0.14em] text-muted sm:block">
          or drag JPG/PNG files and a 3D file anywhere in this box
        </p>
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {previews.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Your uploaded images
            </p>
            <p className="text-[10px] text-muted">
              {files.length}/5 · {imageTotalMb.toFixed(1)} MB / 50 MB
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map(({ file, url }, index) => (
              <div
                key={`${file.name}-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="aspect-square overflow-hidden bg-surface-elevated">
                  <img
                    src={url}
                    alt={`Uploaded reference ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-[10px] text-muted">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
                  }
                  aria-label={`Remove ${file.name}`}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/75"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {modelFile && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-primary">
              <IconCube size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">3D reference</p>
              <p className="truncate text-[10px] text-muted">
                {modelFile.name} · {(modelFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onModelFileChange(null)}
            aria-label={`Remove ${modelFile.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
          >
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
