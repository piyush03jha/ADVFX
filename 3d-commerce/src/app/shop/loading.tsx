import { Container } from "@/components/ui/Container";

export default function ShopLoading() {
  return <main className="min-h-screen bg-background"><div aria-hidden="true" className="h-16 sm:h-20 lg:h-24" /><Container><div className="h-14 w-full animate-pulse rounded-2xl bg-surface" /><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({length:12}).map((_,i)=><div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface/40"><div className="aspect-[0.88/1] animate-pulse bg-surface" /><div className="space-y-2 p-3 sm:p-4"><div className="h-2 w-1/3 animate-pulse rounded bg-surface" /><div className="h-4 w-4/5 animate-pulse rounded bg-surface" /><div className="h-4 w-1/4 animate-pulse rounded bg-surface" /></div></div>)}</div></Container></main>;
}
