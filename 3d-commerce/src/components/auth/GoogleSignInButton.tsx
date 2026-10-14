"use client";

import Link from "next/link";
import { IconBrandGoogle } from "@tabler/icons-react";

type GoogleSignInButtonProps = {
  returnTo?: string;
};

export function GoogleSignInButton({ returnTo = "/account" }: GoogleSignInButtonProps) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
      ? returnTo
      : "/account";

  return (
    <Link
      href={`/api/auth/google/start?returnTo=${encodeURIComponent(safeReturnTo)}`}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <IconBrandGoogle size={17} aria-hidden="true" />
      Continue with Google
    </Link>
  );
}
