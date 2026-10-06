"use client";

import { useCallback, useEffect, useState } from "react";
import { loadModelBuffer, peekModelUrl } from "@/lib/model-loader";

type ModelState = {
  url: string;
  blobUrl: string | null;
  progress: number;
  error: Error | null;
};

const EMPTY: ModelState = { url: "", blobUrl: null, progress: 0, error: null };

export function useModelUrl(url: string) {
  const [state, setState] = useState<ModelState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, error: null, progress: 0 }));
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const target = url.trim();
    if (!target) {
      setState(EMPTY);
      return;
    }

    const patch = (partial: Partial<ModelState>) =>
      setState((current) => ({
        ...(current.url === target ? current : { ...EMPTY, url: target }),
        ...partial,
      }));

    const controller = new AbortController();

    void loadModelBuffer(target, (progress) => patch({ progress }), controller.signal)
      .then((blobUrl) => patch({ blobUrl, progress: 100, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        patch({
          error: cause instanceof Error ? cause : new Error("Model failed to load"),
        });
      });

    return () => controller.abort();
  }, [attempt, url]);

  const target = url.trim();
  const matches = target !== "" && state.url === target;

  return {
    blobUrl: (matches ? state.blobUrl : null) ?? (target ? peekModelUrl(target) : null),
    progress: matches ? state.progress : 0,
    error: matches ? state.error : null,
    retry,
  };
}
