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
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="mb-5 sm:mb-7">
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-primary sm:text-[10px]">
            FORMA / ACCOUNT
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>

          {description && (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              {description}
            </p>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
          <AccountNav />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
