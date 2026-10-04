"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-6 py-20">
          <div className="max-w-md text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
              Voxel3D
            </p>
            <h1 className="mt-3 text-2xl font-semibold">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-6 opacity-70">
              Please retry the page. A failed 3D preview cannot take down the
              storefront.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-full border border-current/20 px-5 py-2.5 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
