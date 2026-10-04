"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconRefresh } from "@tabler/icons-react";

type Promotion = { id:string; name:string; code?:string|null; type:string; value:number; usageLimit?:number|null; usageCount:number; isActive:boolean };
type TaxRule = { id:string; name:string; countryCode:string; stateCode?:string|null; rateBps:number; priority:number; isActive:boolean };

export default function AdminCommerceRulesPage() {
  const [promotions,setPromotions]=useState<Promotion[]>([]);
  const [taxRules,setTaxRules]=useState<TaxRule[]>([]);
  const [promo,setPromo]=useState({name:"",code:"",type:"PERCENTAGE",value:"",minSubtotalMinor:"",maxDiscountMinor:"",usageLimit:""});
  const [tax,setTax]=useState({name:"",countryCode:"IN",stateCode:"",rate:"",priority:"0",applyToShipping:false});
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const [p,t]=await Promise.all([fetch("/api/admin/promotions",{cache:"no-store"}),fetch("/api/admin/tax-rules",{cache:"no-store"})]);
      if(!p.ok||!t.ok) throw new Error();
      setPromotions(await p.json()); setTaxRules(await t.json()); setMessage("");
    }catch{setMessage("Unable to load commerce rules.");}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  async function createPromotion(){
    const response=await fetch("/api/admin/promotions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:promo.name,code:promo.code||null,type:promo.type,value:Number(promo.value),
      minSubtotalMinor:promo.minSubtotalMinor?Number(promo.minSubtotalMinor):null,
      maxDiscountMinor:promo.maxDiscountMinor?Number(promo.maxDiscountMinor):null,
      usageLimit:promo.usageLimit?Number(promo.usageLimit):null,
    })});
    if(!response.ok){setMessage("Unable to save promotion.");return;}
    setPromo({name:"",code:"",type:"PERCENTAGE",value:"",minSubtotalMinor:"",maxDiscountMinor:"",usageLimit:""}); await load();
  }

  async function createTax(){
    const response=await fetch("/api/admin/tax-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:tax.name,countryCode:tax.countryCode,stateCode:tax.stateCode||null,
      rateBps:Math.round(Number(tax.rate)*100),priority:Number(tax.priority||0),applyToShipping:tax.applyToShipping,
    })});
    if(!response.ok){setMessage("Unable to save tax rule.");return;}
    setTax({name:"",countryCode:"IN",stateCode:"",rate:"",priority:"0",applyToShipping:false}); await load();
  }

  async function toggle(kind:string,id:string,isActive:boolean){
    await fetch("/api/admin/"+kind+"/"+encodeURIComponent(id)+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!isActive})}); await load();
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">Commerce</p><h1 className="mt-2 font-serif text-4xl">Promotions & tax</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-muted">Manage checkout promotions and tax rules.</p></div>
      <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted"><IconRefresh size={14}/> Refresh</button>
    </div>
    {message&&<p className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">{message}</p>}
    {loading?<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface"/>:<div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-semibold">Promotions</h2>
        <div className="mt-4 grid gap-3">
          {["name","code","value","minSubtotalMinor","maxDiscountMinor","usageLimit"].map((field)=><input key={field} value={promo[field as keyof typeof promo]} onChange={e=>setPromo({...promo,[field]:e.target.value})} placeholder={field} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>)}
          <select value={promo.type} onChange={e=>setPromo({...promo,type:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select>
          <button type="button" onClick={()=>void createPromotion()} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-white transition hover:bg-primary-hover"><IconPlus size={14}/> Add promotion</button>
        </div>
        <div className="mt-5 space-y-2">{promotions.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-xs font-medium">{p.name}{p.code ? " · "+p.code : ""}</p><p className="mt-1 text-[10px] text-muted">{p.type} · {p.value} · used {p.usageCount}{p.usageLimit!=null ? "/"+p.usageLimit : ""}</p></div><button type="button" onClick={()=>void toggle("promotions",p.id,p.isActive)} className="text-[10px] text-muted">{p.isActive?"Disable":"Enable"}</button></div>)}</div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-semibold">Tax rules</h2>
        <div className="mt-4 grid gap-3">
          {["name","countryCode","stateCode","rate","priority"].map((field)=><input key={field} value={tax[field as keyof typeof tax] as string} onChange={e=>setTax({...tax,[field]:e.target.value})} placeholder={field} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>)}
          <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={tax.applyToShipping} onChange={e=>setTax({...tax,applyToShipping:e.target.checked})}/> Apply tax to shipping</label>
          <button type="button" onClick={()=>void createTax()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground text-xs font-semibold text-background"><IconPlus size={14}/> Add tax rule</button>
        </div>
        <div className="mt-5 space-y-2">{taxRules.map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-xs font-medium">{t.name}</p><p className="mt-1 text-[10px] text-muted">{t.countryCode}{t.stateCode ? " / "+t.stateCode : ""} · {(t.rateBps/100).toFixed(2)}% · priority {t.priority}</p></div><button type="button" onClick={()=>void toggle("tax-rules",t.id,t.isActive)} className="text-[10px] text-muted">{t.isActive?"Disable":"Enable"}</button></div>)}</div>
      </section>
    </div>}
  </main>;
}
