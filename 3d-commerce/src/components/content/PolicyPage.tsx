import Link from "next/link";

export function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
}) {
  return (
    <main className="min-h-screen bg-background px-5 pb-20 pt-32 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-[10px] uppercase tracking-[0.18em] text-primary hover:text-primary-hover">
          FORMA.
        </Link>
        <p className="mt-10 text-[10px] font-medium uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-muted sm:text-base">{intro}</p>
        <div className="mt-12 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted">
          Questions? Contact <a className="text-foreground underline decoration-border underline-offset-4" href="mailto:hello@forma3d.in">hello@forma3d.in</a>.
        </p>
      </div>
    </main>
  );
}
