import { AccountNav } from "./AccountNav";

interface AccountShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AccountShell({
  children,
  title = "My Account",
  description,
}: AccountShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/[0.045] blur-[110px]"
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32">
        <header className="mb-7 flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-6 sm:mb-9 sm:flex-row sm:items-end sm:pb-7">
          <div>
            <h1 className="font-serif text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-muted sm:text-sm sm:leading-6">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Account dashboard
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-9">
          <AccountNav />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
