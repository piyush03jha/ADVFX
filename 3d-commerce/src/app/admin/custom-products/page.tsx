"use client";
import { useEffect, useState } from "react";
import { IconPhoto, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { resolveMediaUrl } from "@/lib/media-url";

type Option={id:string;section:string;slug:string;name:string;description?:string|null;imageUrl?:string|null;priceMinor:number;multiplier?:number|null;sortOrder:number;isActive:boolean};
type Category={id:string;slug:string;name:string;description?:string|null;imageUrl?:string|null;basePriceMinor:number;currency:string;sortOrder:number;isActive:boolean;options:Option[]};

const sections=["body","head","frame","size"];
export default function CustomProductsAdmin(){
 const [categories,setCategories]=useState<Category[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [open,setOpen]=useState<string|null>(null);
 async function load(){setLoading(true);try{const r=await fetch("/api/admin/custom-build",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d?.message||d?.error);setCategories(d);setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load custom configuration")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function patch(path:string,body:any){const r=await fetch("/api/admin/custom-build"+path,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.error||"Save failed");await load()}
 async function upload(id:string,file:File){const fd=new FormData();fd.append("file",file);const r=await fetch("/api/admin/custom-build/categories/"+id+"/image",{method:"POST",body:fd});if(!r.ok)throw new Error((await r.json().catch(()=>null))?.message||"Image upload failed");await load()}
 async function addOption(c:Category){const section=window.prompt("Section: body, head, frame or size","head");if(!section||!sections.includes(section))return;const slug=window.prompt("Option slug (e.g. bobble)","new-option");const name=window.prompt("Option name","New option");if(!slug||!name)return;const price=Number(window.prompt("Price in INR","0")||0);const r=await fetch("/api/admin/custom-build/categories/"+c.id+"/options",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({section,slug,name,priceMinor:Math.round(price*100),sortOrder:c.options.length})});if(!r.ok){setMessage((await r.json().catch(()=>null))?.message||"Option creation failed");return}await load()}
 async function uploadOption(id:string,file:File){const fd=new FormData();fd.append("file",file);const r=await fetch("/api/admin/custom-build/options/"+id+"/image",{method:"POST",body:fd});if(!r.ok)throw new Error((await r.json().catch(()=>null))?.message||"Option image upload failed");await load()}
 async function removeOption(id:string){if(!confirm("Delete this custom option?"))return;const r=await fetch("/api/admin/custom-build/options/"+id,{method:"DELETE"});if(!r.ok){setMessage("Unable to delete option");return}await load()}
 if(loading)return <main className="mx-auto max-w-6xl px-4 py-10"><p className="text-sm text-muted">Loading custom product controls…</p></main>;
 return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
  <div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">Custom production</p><h1 className="mt-2 font-serif text-4xl">Custom Products</h1><p className="mt-2 max-w-2xl text-sm text-muted">Control the six custom-build categories, images, base pricing and customer-facing options.</p></div>
  {message&&<p className="mt-4 text-xs text-red-300">{message}</p>}
  <div className="mt-7 space-y-4">{categories.map(c=><section key={c.id} className="rounded-2xl border border-border bg-surface p-5">
   <div className="flex flex-wrap items-center gap-4">
    <div className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-background">{c.imageUrl?<img src={resolveMediaUrl(c.imageUrl) ?? ""} className="h-full w-full object-cover" alt="" />:<div className="flex h-full items-center justify-center text-muted"><IconPhoto size={22}/></div>}</div>
    <div className="min-w-[180px] flex-1"><input defaultValue={c.name} onBlur={e=>e.target.value!==c.name&&patch("/categories/"+c.id,{name:e.target.value})} className="w-full bg-transparent text-lg font-semibold outline-none"/><p className="text-[10px] text-muted">{c.slug} · {c.isActive?"ACTIVE":"INACTIVE"}</p></div>
    <label className="cursor-pointer rounded-xl border border-border px-3 py-2 text-[10px]"><IconUpload size={14} className="mr-1 inline"/> Image<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>e.target.files?.[0]&&upload(c.id,e.target.files[0])}/></label>
    <label className="text-[10px] text-muted">Base price (₹)<input type="number" defaultValue={c.basePriceMinor/100} onBlur={e=>{const v=Number(e.target.value);if(v*100!==c.basePriceMinor)patch("/categories/"+c.id,{basePriceMinor:Math.round(v*100)})}} className="mt-1 block h-9 w-28 rounded-lg border border-border bg-background px-2 text-xs text-foreground"/></label>
    <button onClick={()=>setOpen(open===c.id?null:c.id)} className="rounded-full bg-primary px-4 py-2 text-[10px] font-semibold text-white transition hover:bg-primary-hover">{open===c.id?"Hide options":"Edit options"}</button>
   </div>
   <p className="mt-3 text-xs text-muted">{c.description}</p>
   {open===c.id&&<div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Options</h2><button onClick={()=>void addOption(c)} className="rounded-lg border border-border px-3 py-2 text-[10px]"><IconPlus size={13} className="mr-1 inline"/> Add option</button></div>
    <div className="mt-3 space-y-2">{c.options.map(o=><div key={o.id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[52px_90px_1fr_110px_90px_auto] sm:items-center"><label className="relative h-11 w-11 cursor-pointer overflow-hidden rounded-lg border border-border bg-background">{o.imageUrl?<img src={resolveMediaUrl(o.imageUrl) ?? ""} alt="" className="h-full w-full object-cover" />:<IconPhoto size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted"/>}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>e.target.files?.[0]&&uploadOption(o.id,e.target.files[0])}/></label><span className="text-[9px] uppercase tracking-wider text-primary">{o.section}</span><input defaultValue={o.name} onBlur={e=>e.target.value!==o.name&&patch("/options/"+o.id,{name:e.target.value})} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/><input type="number" defaultValue={o.priceMinor/100} onBlur={e=>patch("/options/"+o.id,{priceMinor:Math.round(Number(e.target.value)*100)})} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/><button onClick={()=>patch("/options/"+o.id,{isActive:!o.isActive})} className="text-[9px]">{o.isActive?"ACTIVE":"INACTIVE"}</button><button onClick={()=>void removeOption(o.id)} className="text-muted hover:text-red-400"><IconTrash size={15}/></button></div>)}</div>
   </div>}
  </section>)}</div>
 </main>
}