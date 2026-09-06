"use client";

import { ChangeEvent, DragEvent, ReactNode, useRef, useState } from "react";
import { IconCloudUpload, IconFile3d, IconPhoto, IconX } from "@tabler/icons-react";

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const MODEL_EXTENSION = /\.(glb|gltf|obj|stl|fbx)$/i;

function isModelFile(file: File) {
  return MODEL_EXTENSION.test(file.name);
}

export function CustomUploadZone({
  files,
  onFilesChange,
  error,
  onErrorChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  error: string;
  onErrorChange: (error: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function acceptFiles(incoming: File[]) {
    const accepted = incoming.filter((file) => IMAGE_TYPES.includes(file.type) || isModelFile(file));
    onErrorChange(accepted.length !== incoming.length ? "Only JPG, PNG, GLB, GLTF, OBJ, STL and FBX files are accepted." : "");
    onFilesChange([...files, ...accepted].slice(0, 10));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    acceptFiles(Array.from(event.dataTransfer.files ?? []));
  }

  return (
    <div>
      <input ref={photoInputRef} type="file" multiple accept="image/jpeg,image/png" className="sr-only" onChange={handleInputChange} />
      <input ref={modelInputRef} type="file" multiple accept=".glb,.gltf,.obj,.stl,.fbx" className="sr-only" onChange={handleInputChange} />

      <div
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-[24px] border border-dashed p-3 transition ${dragActive ? "border-primary/70 bg-primary/[0.05]" : "border-white/15 bg-background/25"}`}
      >
        <div className="grid grid-cols-2 gap-3">
          <UploadTrigger title="Upload photos" text="Front · back · left · right" icon={<IconPhoto size={21} />} onClick={() => photoInputRef.current?.click()} />
          <UploadTrigger title="Upload 3D model" text="GLB · GLTF · OBJ · STL" icon={<IconFile3d size={21} />} onClick={() => modelInputRef.current?.click()} />
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted">or drag files anywhere in this box</p>
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-primary">{isModelFile(file) ? <IconFile3d size={15} /> : <IconPhoto size={15} />}</span>
                <span className="truncate text-xs text-muted">{file.name}</span>
              </div>
              <button type="button" onClick={() => onFilesChange(files.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-elevated"><IconX size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadTrigger({ title, text, icon, onClick }: { title: string; text: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[132px] flex-col justify-between rounded-2xl border border-white/10 bg-background/45 p-4 text-left transition duration-300 hover:border-primary/55 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:min-h-[150px] sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary transition group-hover:scale-105">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-muted">{text}</p>
      </div>
    </button>
  );
}
