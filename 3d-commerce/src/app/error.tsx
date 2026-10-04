"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          This page couldn&apos;t load
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          A preview or page component failed. Your products and account data are
          still safe.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:bg-surface-elevated"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
