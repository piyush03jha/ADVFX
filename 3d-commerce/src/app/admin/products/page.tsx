"use client";

import { useEffect, useMemo, useState } from "react";
import { IconArchive, IconPlus, IconRefresh, IconSearch, IconTrash, IconUpload, IconBox, IconX, IconEdit } from "@tabler/icons-react";

type Product={id:string;name:string;slug:string;status:string;isFeatured:boolean;isTrending:boolean;isBestseller:boolean;category?:{id:string;name:string}|null;prices:any[];inventory?:{stock:number;reserved:number;lowStockAt:number}|null;media?:Array<{id:string;type:string;url:string;altText?:string|null;isPrimary:boolean;sortOrder:number}>};
type ProductFile={id:string;originalName:string;storageUrl:string;format:string;fileType:string;mimeType:string;fileSize:string|number;processingStatus:string};
type Category={id:string;name:string};

export default function AdminProducts(){
  const [data,setData]=useState<{products:Product[];categories:Category[]}>({products:[],categories:[]});
  const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  const [form,setForm]=useState({name:"",slug:"",description:"",categoryId:"",status:"ACTIVE",price:"",stock:"0",isFeatured:false});
  const [assetProductId,setAssetProductId]=useState<string|null>(null);
  const [assetFiles,setAssetFiles]=useState<ProductFile[]>([]);
  const [assetLoading,setAssetLoading]=useState(false);
  const [assetMessage,setAssetMessage]=useState("");
  const [assetBusy,setAssetBusy]=useState(false);
  const [editingProduct,setEditingProduct]=useState<string|null>(null);
  const [editForm,setEditForm]=useState<Record<string,string|boolean>>({});

  async function load(){setLoading(true);try{const r=await fetch("/api/admin/catalog",{cache:"no-store"});if(!r.ok)throw new Error();setData(await r.json());setMessage("")}catch{setMessage("Unable to load catalog.")}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const rows=useMemo(()=>data.products.filter(p=>[p.name,p.slug,p.category?.name||""].join(" ").toLowerCase().includes(search.trim().toLowerCase())),[data.products,search]);

  async function updatePrice(id:string,value:string){const amount=Number(value);if(!Number.isFinite(amount)||amount<0)return;setSaving(true);try{const r=await fetch("/api/products/"+id+"/pricing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currency:"INR",amountMinor:Math.round(amount*100)})});if(!r.ok)throw new Error();setMessage("Price updated.");await load()}catch{setMessage("Unable to update price.")}finally{setSaving(false)}}
  async function updateProduct(id:string,patch:Record<string,unknown>){setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});if(!r.ok)throw new Error();setMessage("Product updated.");await load()}catch{setMessage("Unable to update product.")}finally{setSaving(false)}}
  async function deleteProduct(id:string,name:string){if(!window.confirm('Permanently delete "'+name+'"? Use Archive instead when the product has historical orders.'))return;setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"DELETE"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"Unable to delete product.");setMessage("Product deleted.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to delete product.")}finally{setSaving(false)}}

  async function createProduct(e:React.FormEvent){
    e.preventDefault();setSaving(true);setMessage("");
    try{
      const slug=form.slug||form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,slug,description:form.description||undefined,categoryId:form.categoryId||undefined,status:form.status,stock:Number(form.stock)||0,isFeatured:form.isFeatured})});
      if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||"Create failed")}
      const p=await r.json();
      if(form.price){const pr=await fetch("/api/products/"+p.id+"/pricing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currency:"INR",amountMinor:Math.round(Number(form.price)*100)})});if(!pr.ok)throw new Error("Product created but price was not saved.")}
      setForm({name:"",slug:"",description:"",categoryId:"",status:"ACTIVE",price:"",stock:"0",isFeatured:false});setMessage("Product created.");await load()
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to create product.")}finally{setSaving(false)}
  }

  function startProductEdit(p:Product){
    setEditingProduct(p.id);setEditForm({name:p.name,slug:p.slug,description:"",categoryId:p.category?.id||"",status:p.status,isFeatured:p.isFeatured,isTrending:p.isTrending,isBestseller:p.isBestseller,badge:"",material:"",scale:"",dimensions:"",height:"",base:"",packaging:"",weight:""});
  }
  async function saveProductEdit(id:string){
    setSaving(true);setMessage("");
    try{const payload={...editForm,name:String(editForm.name).trim(),slug:String(editForm.slug).trim(),description:String(editForm.description||""),categoryId:String(editForm.categoryId||"")||undefined,status:String(editForm.status),isFeatured:Boolean(editForm.isFeatured),isTrending:Boolean(editForm.isTrending),isBestseller:Boolean(editForm.isBestseller),badge:String(editForm.badge||"")||undefined,material:String(editForm.material||"")||undefined,scale:String(editForm.scale||"")||undefined,dimensions:String(editForm.dimensions||"")||undefined,height:String(editForm.height||"")||undefined,base:String(editForm.base||"")||undefined,packaging:String(editForm.packaging||"")||undefined,weight:String(editForm.weight||"")||undefined};const r=await fetch("/api/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"Unable to update product");setMessage("Product updated.");setEditingProduct(null);await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to update product")}finally{setSaving(false)}
  }

  async function openAssets(id:string){
    if(assetProductId===id){setAssetProductId(null);return;}
    setAssetProductId(id);setAssetLoading(true);setAssetMessage("");
    try{const r=await fetch("/api/products/"+id+"/files",{cache:"no-store"});if(!r.ok)throw new Error();setAssetFiles(await r.json())}catch{setAssetMessage("Unable to load 3D assets.")}finally{setAssetLoading(false)}
  }
  async function uploadImages(id:string,files:FileList|null){
    if(!files?.length)return;setAssetBusy(true);setAssetMessage("");
    try{for(const file of Array.from(files)){const fd=new FormData();fd.append("file",file);const r=await fetch("/api/products/"+id+"/media/upload",{method:"POST",body:fd});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.error||("Unable to upload "+file.name))}setAssetMessage(files.length+" image"+(files.length>1?"s":"")+" uploaded.");await load()}catch(e){setAssetMessage(e instanceof Error?e.message:"Image upload failed.")}finally{setAssetBusy(false)}
  }
  async function uploadGlb(id:string,file:File|null){
    if(!file)return;setAssetBusy(true);setAssetMessage("");
    try{const fd=new FormData();fd.append("file",file);const r=await fetch("/api/products/"+id+"/files",{method:"POST",body:fd});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||d?.error||"GLB upload failed");
      const media=await fetch("/api/products/"+id+"/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"MODEL_PREVIEW",url:d.storageUrl,isPrimary:true,altText:file.name})});
      if(!media.ok){const md=await media.json().catch(()=>null);throw new Error(md?.message||"GLB uploaded but model preview could not be linked.")}
      setAssetMessage("3D model uploaded and linked to the product.");
      const fr=await fetch("/api/products/"+id+"/files",{cache:"no-store"});if(fr.ok)setAssetFiles(await fr.json());await load();
    }catch(e){setAssetMessage(e instanceof Error?e.message:"GLB upload failed.")}finally{setAssetBusy(false)}
  }
  async function removeMedia(id:string,mediaId:string){
    if(!window.confirm("Remove this product media?"))return;setAssetBusy(true);
    try{const r=await fetch("/api/products/"+id+"/media/"+mediaId,{method:"DELETE"});if(!r.ok)throw new Error();setAssetMessage("Media removed.");await load()}catch{setAssetMessage("Unable to remove media.")}finally{setAssetBusy(false)}
  }
  async function removeFile(id:string,fileId:string){
    if(!window.confirm("Delete this 3D file?"))return;setAssetBusy(true);
    try{const r=await fetch("/api/products/"+id+"/files/"+fileId,{method:"DELETE"});if(!r.ok)throw new Error();setAssetMessage("3D file removed.");const fr=await fetch("/api/products/"+id+"/files",{cache:"no-store"});if(fr.ok)setAssetFiles(await fr.json());await load()}catch{setAssetMessage("Unable to delete 3D file.")}finally{setAssetBusy(false)}
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">Catalog</p><h1 className="mt-2 font-serif text-4xl">Products</h1><p className="mt-2 text-sm text-muted">Create, archive or permanently delete products, feature hero items, change prices and review stock.</p></div><button onClick={()=>void load()} className="rounded-xl border border-border p-2 text-muted"><IconRefresh size={16}/></button></div>
    <form onSubmit={createProduct} className="mt-7 rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2 text-xs font-semibold"><IconPlus size={16} className="text-primary"/> Add product</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Product name" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="Slug (optional)" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} type="number" min="0" placeholder="Price ₹" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <input value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} type="number" min="0" placeholder="Stock" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="">No category</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option></select>
      <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs sm:col-span-2"/>
      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/> Show in hero</label>
    </div><button disabled={saving} className="mt-4 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">{saving?"Saving…":"Create product"}</button></form>
    <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-3"><IconSearch size={15} className="text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" className="h-10 flex-1 bg-transparent text-xs outline-none"/></div>
    <div className="mt-5 space-y-3">{loading?[1,2,3].map(i=><div key={i} className="h-28 animate-pulse rounded-2xl bg-surface"/>):rows.map(p=><article key={p.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">{p.name}</p><p className="mt-1 text-[10px] text-muted">{p.slug} · {p.category?.name||"Uncategorized"}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] text-primary">{p.status}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Price</p><div className="mt-1 flex items-center gap-2"><span className="text-xs text-muted">₹</span><input defaultValue={((p.prices?.[0]?.amountMinor||0)/100).toString()} type="number" min="0" step="1" className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-xs"/><button onClick={e=>{const input=(e.currentTarget.previousElementSibling as HTMLInputElement);void updatePrice(p.id,input.value)}} disabled={saving} className="rounded-lg border border-border px-2 py-1.5 text-[9px]">Save</button></div></div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Stock</p><p className="mt-1 text-sm">{p.inventory?Math.max(0,p.inventory.stock-p.inventory.reserved):0}</p></div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Hero</p><button onClick={()=>void updateProduct(p.id,{isFeatured:!p.isFeatured})} disabled={saving} className="mt-1 rounded-lg border border-border px-2.5 py-1.5 text-[9px]">{p.isFeatured?"Remove from hero":"Feature in hero"}</button></div>
        <div className="flex items-end justify-end gap-2"><button onClick={()=>void updateProduct(p.id,{status:"ARCHIVED"})} disabled={saving||p.status==="ARCHIVED"} title="Archive product" className="rounded-lg border border-border p-2 text-muted"><IconArchive size={14}/></button><button onClick={()=>void deleteProduct(p.id,p.name)} disabled={saving} title="Permanently delete product" className="rounded-lg border border-red-400/20 p-2 text-red-300"><IconTrash size={14}/></button></div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Assets</p><p className="mt-1 text-[10px] text-muted">{p.media?.filter(m=>m.type==="IMAGE").length||0} images · {p.media?.filter(m=>m.type==="MODEL_PREVIEW").length||0} model previews</p></div>
          <button onClick={()=>void openAssets(p.id)} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-semibold">{assetProductId===p.id?"Close assets":"Manage photos & 3D"}</button>
        </div>
        {assetProductId===p.id&&<div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between"><p className="text-xs font-semibold">Product photos</p><label className="cursor-pointer rounded-lg bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background"><IconUpload size={13} className="mr-1 inline"/>Upload images<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={assetBusy} onChange={e=>{void uploadImages(p.id,e.target.files);e.currentTarget.value=""}}/></label></div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(p.media||[]).filter(m=>m.type==="IMAGE").map(m=><div key={m.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface"><img src={"/api/products/"+p.id+"/media/"+m.id+"/file"} alt={m.altText||p.name} className="aspect-square w-full object-cover"/><button onClick={()=>void removeMedia(p.id,m.id)} disabled={assetBusy} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"><IconX size={12}/></button>{m.isPrimary&&<span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] text-white">Primary</span>}</div>)}
                {!p.media?.some(m=>m.type==="IMAGE")&&<p className="col-span-3 rounded-lg border border-dashed border-border p-6 text-center text-[10px] text-muted">No product photos yet.</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold">3D model</p><p className="mt-1 text-[10px] text-muted">Upload a web-ready GLB. It will be linked as the product model preview.</p></div><label className="cursor-pointer rounded-lg bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background"><IconBox size={13} className="mr-1 inline"/>Upload GLB<input type="file" accept=".glb,model/gltf-binary" className="hidden" disabled={assetBusy} onChange={e=>{void uploadGlb(p.id,e.target.files?.[0]||null);e.currentTarget.value=""}}/></label></div>
              <div className="mt-3 space-y-2">{assetLoading?<p className="text-[10px] text-muted">Loading 3D assets…</p>:assetFiles.map(f=><div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"><div className="min-w-0"><p className="truncate text-[10px] font-medium">{f.originalName}</p><p className="text-[9px] text-muted">{f.format} · {f.processingStatus} · {typeof f.fileSize==="number"?Math.round(f.fileSize/1024/1024*10)/10:f.fileSize} bytes</p></div><button onClick={()=>void removeFile(p.id,f.id)} disabled={assetBusy} className="rounded-lg border border-red-400/20 p-1.5 text-red-300"><IconTrash size={13}/></button></div>)}{!assetLoading&&!assetFiles.length&&<p className="rounded-lg border border-dashed border-border p-6 text-center text-[10px] text-muted">No 3D files uploaded yet.</p>}</div>
            </div>
          </div>
          {assetMessage&&<p className="mt-3 text-[10px] text-muted">{assetMessage}</p>}
        </div>}
      </div>
    </article>)}{!loading&&!rows.length&&<div className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No products found.</div>}</div>
    {message&&<p className="mt-4 text-xs text-muted">{message}</p>}
  </main>
}
