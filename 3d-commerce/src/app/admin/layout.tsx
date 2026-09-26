"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconChartBar, IconChevronRight, IconLayoutDashboard, IconLogout, IconMapPin, IconPackage, IconSettings, IconShoppingBag, IconUsers, IconX, IconCategory } from "@tabler/icons-react";

type AdminUser={id:string;name:string|null;email:string;role:string};

const nav=[
  {href:"/admin",label:"Overview",icon:IconLayoutDashboard},
  {href:"/admin/products",label:"Catalog",icon:IconPackage},
  {href:"/admin/categories",label:"Categories",icon:IconCategory},
  {href:"/admin/orders",label:"Orders",icon:IconShoppingBag},
  {href:"/admin/custom-requests",label:"Custom requests",icon:IconChartBar},
  {href:"/admin/customers",label:"Customers",icon:IconUsers},
  {href:"/admin/shipping",label:"Shipping & delivery",icon:IconMapPin},
  {href:"/admin/settings",label:"Store controls",icon:IconSettings},
];

export default function AdminLayout({children}:{children:React.ReactNode}){
  const router=useRouter(); const pathname=usePathname();
  const [loading,setLoading]=useState(true); const [user,setUser]=useState<AdminUser|null>(null); const [open,setOpen]=useState(false);

  useEffect(()=>{if(pathname === "/admin/login"){setLoading(false);return;}fetch("/api/auth/admin/session",{cache:"no-store"}).then(r=>r.ok?r.json():{user:null}).then(d=>{if(d.user)setUser(d.user);else router.replace("/admin/login");}).catch(()=>router.replace("/admin/login")).finally(()=>setLoading(false));},[pathname,router]);

  const activeLabel=useMemo(()=>nav.find(item=>item.href==="/admin" ? pathname==="/admin" : pathname.startsWith(item.href))?.label ?? "Admin",[pathname]);
  const logout=async()=>{await fetch("/api/auth/admin/logout",{method:"POST"});router.replace("/admin/login");};

  if(pathname === "/admin/login") return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  if(loading)return <main className="min-h-screen bg-background flex items-center justify-center text-xs text-muted">Loading admin workspace…</main>;
  if(!user)return null;

  return <div className="min-h-screen bg-background text-foreground">
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={()=>setOpen(false)}/>}
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className={open?"fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col border-r border-border bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0":"fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 -translate-x-full flex-col border-r border-border bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"}>
        <div className="flex items-start justify-between px-3 py-3">
          <Link href="/admin" className="min-w-0" onClick={()=>setOpen(false)}>
            <p className="text-[9px] uppercase tracking-[0.25em] text-primary">FORMA / ADMIN</p><p className="mt-1 text-base font-semibold tracking-[-0.02em]">Operations</p>
          </Link>
          <button className="rounded-lg p-2 text-muted lg:hidden" onClick={()=>setOpen(false)}><IconX size={18}/></button>
        </div>
        <nav className="mt-5 space-y-1">
          {nav.map(({href,label,icon:Icon})=>{const active=href==="/admin"?pathname==="/admin":pathname.startsWith(href);return <Link key={href} href={href} onClick={()=>setOpen(false)} className={active?"flex items-center justify-between rounded-xl bg-primary/[0.08] px-3 py-2.5 text-xs text-primary":"flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-muted hover:bg-surface hover:text-foreground"}><span className="flex items-center gap-3"><Icon size={17} stroke={1.7}/>{label}</span><IconChevronRight size={14}/></Link>})}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-[9px] uppercase tracking-[0.14em] text-muted">Signed in</p><p className="mt-1 truncate text-xs font-medium">{user.name||"Administrator"}</p><p className="mt-1 truncate text-[10px] text-muted">{user.email}</p></div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs text-muted hover:text-foreground"><IconLogout size={16}/> Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl"><div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button className="rounded-xl border border-border p-2 lg:hidden" onClick={()=>setOpen(true)} aria-label="Open navigation"><span className="block h-4 w-4 border-y border-foreground/70"/></button><div><p className="text-[9px] uppercase tracking-[0.18em] text-muted">Admin workspace</p><p className="mt-0.5 text-xs font-medium">{activeLabel}</p></div></div>
          <Link href="/shop" className="text-[10px] uppercase tracking-[0.14em] text-muted hover:text-primary">View storefront ↗</Link>
        </div></header>
        {children}
      </div>
    </div>
  </div>;
}