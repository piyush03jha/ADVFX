"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminUser={id:string;name:string|null;email:string;role:string};

export default function AdminLayout({children}:{children:React.ReactNode}){
 const router=useRouter(); const [loading,setLoading]=useState(true); const [user,setUser]=useState<AdminUser|null>(null);
 useEffect(()=>{fetch("/api/auth/admin/session",{cache:"no-store"}).then(r=>r.ok?r.json():{user:null}).then(d=>{if(d.user)setUser(d.user);else router.replace("/admin/login");}).catch(()=>router.replace("/admin/login")).finally(()=>setLoading(false));},[router]);
 if(loading)return <main className="min-h-screen bg-background flex items-center justify-center text-xs text-muted">Loading admin…</main>;
 if(!user)return null;
 return <div className="min-h-screen bg-background text-foreground"><header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">FORMA / ADMIN</p><p className="text-sm font-medium">{user.name||user.email}</p></div><nav className="hidden items-center gap-4 md:flex text-xs text-muted"><Link href="/admin">Dashboard</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/custom-requests">Custom requests</Link></nav><button className="text-xs text-muted hover:text-foreground" onClick={async()=>{await fetch("/api/auth/admin/logout",{method:"POST"});router.replace("/admin/login");}}>Sign out</button></div></header>{children}</div>
}