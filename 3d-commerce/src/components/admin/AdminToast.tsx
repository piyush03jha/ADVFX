"use client";

import { useEffect } from "react";
import { IconAlertCircle, IconCircleCheck, IconX } from "@tabler/icons-react";

// Words that mark a status message as a failure so it is shown in red.
const ERROR_PATTERN = /unable|failed|cannot|can't|already exists|error|invalid|enter a|choose|required/i;

export function AdminToast({
  message,
  onDismiss,
  durationMs = 6000,
}: {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;
  const isError = ERROR_PATTERN.test(message);

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`fixed right-4 top-20 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-xs shadow-xl backdrop-blur ${
        isError
          ? "border-red-500/40 bg-red-500/15 text-red-100"
          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
      }`}
    >
      {isError ? <IconAlertCircle size={16} className="mt-px shrink-0" /> : <IconCircleCheck size={16} className="mt-px shrink-0" />}
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="shrink-0 opacity-70 transition hover:opacity-100">
        <IconX size={14} />
      </button>
    </div>
  );
}
