"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const r = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();

      if (!r.ok) {
        setError(d.error ?? "Unable to sign in.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Admin service is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-7 shadow-[var(--shadow-card)]"
      >
        <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Voxel3D / ADMIN</p>
        <h1 className="mt-2 font-serif text-4xl">Admin sign in</h1>

        <label className="mt-6 block text-xs text-muted">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>

        <label className="mt-4 block text-xs text-muted">
          Admin password
          <input
            required
            minLength={12}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>

        {error && <p className="mt-4 text-xs text-red-300">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading}
          className="mt-6 w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
