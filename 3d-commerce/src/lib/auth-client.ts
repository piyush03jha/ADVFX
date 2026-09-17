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

export async function verifyEmail(token: string) {
  const response = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = (await response.json()) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "This verification link is invalid or expired.");
  }

  return data.message ?? "Email verified successfully.";
}

export async function resendVerificationEmail(email: string) {
  const response = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json()) as {
    message?: string;
    error?: string;
    developmentOnly?: { emailVerificationToken?: string };
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to resend the verification email.");
  }

  return {
    message: data.message ?? "If the account exists and is not verified, a verification email has been sent.",
    developmentToken: data.developmentOnly?.emailVerificationToken,
  };
}

export async function requestPasswordReset(email: string) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json()) as {
    message?: string;
    error?: string;
    developmentOnly?: { passwordResetToken?: string };
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to request a password reset.");
  }

  return {
    message: data.message ?? "If the account exists, password reset instructions have been sent.",
    developmentToken: data.developmentOnly?.passwordResetToken,
  };
}

export async function resetPassword(token: string, password: string) {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const data = (await response.json()) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "This password reset link is invalid or expired.");
  }

  return data.message ?? "Password reset successfully.";
}
