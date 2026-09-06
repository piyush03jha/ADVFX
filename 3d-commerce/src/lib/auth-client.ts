"use client";

import type { AuthUser } from "@/lib/auth";

export async function loginUser(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as { user?: AuthUser; error?: string };

  if (!response.ok || !data.user) {
    throw new Error(data.error ?? "Unable to sign in.");
  }

  return data.user;
}

export async function registerUser(name: string, email: string, password: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = (await response.json()) as { user?: AuthUser; error?: string };

  if (!response.ok || !data.user) {
    throw new Error(data.error ?? "Unable to create your account.");
  }

  return data.user;
}
