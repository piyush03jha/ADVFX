"use client";

import { useCallback, useEffect, useState } from "react";

export type CaptchaPurpose = "login" | "register";
export type CaptchaChallenge = {
  token: string;
  first: number;
  second: number;
  operator: "+" | "−";
};

export function useAuthCaptcha(purpose: CaptchaPurpose) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch(`/api/auth/captcha?purpose=${purpose}`, { cache: "no-store" });
      const data = (await response.json()) as CaptchaChallenge & { error?: string };
      if (!response.ok || !data.token) throw new Error(data.error ?? "Unable to prepare security check.");
      setChallenge(data);
    } catch (loadError) {
      setChallenge(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to prepare security check.");
    } finally {
      setIsLoading(false);
    }
  }, [purpose]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { challenge, answer, setAnswer, isLoading, error, refresh };
}
