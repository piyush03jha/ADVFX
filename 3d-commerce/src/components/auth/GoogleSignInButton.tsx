import { IconBrandGoogle } from "@tabler/icons-react";

export function GoogleSignInButton({ returnTo, label = "Continue with Google" }: { returnTo: string; label?: string }) {
  return (
    <a
      href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:border-primary/40"
    >
      <IconBrandGoogle size={17} aria-hidden="true" />
      {label}
    </a>
  );
}
