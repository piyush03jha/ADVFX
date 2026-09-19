"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { IconPhoto, IconX } from "@tabler/icons-react";

const IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

function isReferenceImage(file: File) {
  return IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number]);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function acceptFiles(incoming: File[]) {
    const accepted = incoming.filter(isReferenceImage);
    onErrorChange(
      accepted.length !== incoming.length
        ? "Only JPG and PNG files are accepted."
        : "",
    );
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
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={handleInputChange}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-[24px] border border-dashed p-3 transition ${
          dragActive
            ? "border-primary/70 bg-primary/[0.05]"
            : "border-border bg-background/25"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex min-h-[150px] w-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left transition duration-300 hover:border-primary/55 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary transition group-hover:scale-105">
            <IconPhoto size={21} />
          </div>
          <div>
            <p className="text-sm font-medium">Upload reference photos</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              JPG or PNG · front · back · left · right
            </p>
          </div>
        </button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted">
          or drag JPG/PNG files anywhere in this box
        </p>
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => (
            <div
              key={file.name + "-" + index}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <IconPhoto size={15} className="shrink-0 text-primary" />
                <span className="truncate text-xs text-muted">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-elevated"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}