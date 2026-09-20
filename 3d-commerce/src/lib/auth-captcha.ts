"use client";

import { useCallback, useEffect, useState } from "react";

export type CaptchaPurpose = "login" | "register" | "forgot-password";
export type CaptchaProvider = "math" | "turnstile";
export type CaptchaChallenge = {
  token: string;
  first: number;
  second: number;
  operator: "+" | "−";
};

export function useAuthCaptcha(purpose: CaptchaPurpose) {
  const [provider, setProvider] = useState<CaptchaProvider | null>(null);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [token, setToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setAnswer("");
    setToken("");
    setVersion((value) => value + 1);
    try {
      const response = await fetch(`/api/auth/captcha?purpose=${purpose}`, { cache: "no-store" });
      const data = (await response.json()) as {
        provider?: CaptchaProvider;
        token?: string;
        first?: number;
        second?: number;
        operator?: "+" | "−";
        error?: string;
      };
      if (!response.ok || !data.provider) throw new Error(data.error ?? "Unable to prepare security check.");

      setProvider(data.provider);
      if (data.provider === "math" && data.token && data.first !== undefined && data.second !== undefined && data.operator) {
        setChallenge({ token: data.token, first: data.first, second: data.second, operator: data.operator });
      } else {
        setChallenge(null);
      }
    } catch (loadError) {
      setProvider(null);
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

  const setTurnstileToken = useCallback((value: string) => {
    setToken(value);
    setError("");
  }, []);

  return {
    provider,
    challenge,
    token,
    setTurnstileToken,
    answer,
    setAnswer,
    isLoading,
    error,
    version,
    refresh,
  };
}
