"use client";
import type { ReactNode } from 'react';

export function AdminPage({title,eyebrow,description,actions,children}:{title:string;eyebrow?:string;description?:string;actions?:ReactNode;children:ReactNode}){return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div>{eyebrow&&<p className="text-[9px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}<h1 className="mt-2 font-serif text-4xl sm:text-5xl">{title}</h1>{description&&<p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{actions}</div>{children}</main>}
export function AdminCard({children,className='' }:{children:ReactNode;className?:string}){return <section className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>{children}</section>}
export function AdminTable({children}:{children:ReactNode}){return <div className="overflow-x-auto rounded-2xl border border-border"><table className="min-w-full text-left text-xs">{children}</table></div>}
export function AdminTableHeader({children}:{children:ReactNode}){return <thead className="border-b border-border bg-background/60 text-[9px] uppercase tracking-[0.12em] text-muted"><tr>{children}</tr></thead>}
export function AdminButton({children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`rounded-xl border border-border px-3 py-2 text-xs transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${props.className??''}`}>{children}</button>}
