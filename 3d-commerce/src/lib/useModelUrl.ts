"use client";

import { useCallback, useEffect, useState } from "react";
import { loadModelBuffer } from "@/lib/model-loader";

export function useModelUrl(url: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setProgress(0);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!url.trim()) {
      setBlobUrl(null);
      setError(null);
      setProgress(0);
      return;
    }

    setBlobUrl(null);
    setError(null);
    setProgress(0);

    const controller = new AbortController();

    void loadModelBuffer(
      url,
      (value) => {
        if (!cancelled) setProgress(value);
      },
      controller.signal,
    )
      .then((value) => {
        if (!cancelled) setBlobUrl(value);
      })
      .catch((cause) => {
        if (!cancelled && cause instanceof Error) {
          setError(cause);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt, url]);

  return {
    blobUrl,
    progress,
    error,
    retry,
  };
}
