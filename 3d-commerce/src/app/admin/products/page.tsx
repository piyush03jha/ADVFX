"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconRefresh, IconSearch, IconUpload, IconBox } from "@tabler/icons-react";
import AdminProductCard from "@/components/admin/AdminProductCard";
import { Button } from "@/components/ui/Button";

type ProductVariant={id:string;name:string;size?:string|null;sku?:string|null;isActive:boolean;stock?:number;reserved?:number;lowStockAt?:number;trackStock?:boolean;allowBackorder?:boolean;price?:{amountMinor:number;compareAtMinor?:number|null;isActive:boolean}|null};
type Product={id:string;name:string;slug:string;status:string;isFeatured:boolean;isTrending:boolean;isBestseller:boolean;category?:{id:string;name:string}|null;prices:any[];variants?:ProductVariant[];material?:string|null;scale?:string|null;dimensions?:string|null;height?:string|null;base?:string|null;packaging?:string|null;weight?:string|null;inventory?:{stock:number;reserved:number;lowStockAt:number}|null;media?:Array<{id:string;type:string;url:string;altText?:string|null;isPrimary:boolean;sortOrder:number}>};
type ProductFile={id:string;originalName:string;storageUrl:string;format:string;fileType:string;mimeType:string;fileSize:string|number;processingStatus:string};
type Category={id:string;name:string};

export default function AdminProducts(){
  const [data,setData]=useState<{products:Product[];categories:Category[]}>({products:[],categories:[]});
  const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  const [form,setForm]=useState({name:"",slug:"",description:"",categoryId:"",status:"ACTIVE",stock:"0",isFeatured:false,material:"",scale:"",dimensions:"",height:"",base:"",packaging:"",weight:""});
  const [productImages,setProductImages]=useState<File[]>([]);
  const [productGlb,setProductGlb]=useState<File|null>(null);
  const [assetProductId,setAssetProductId]=useState<string|null>(null);
  const [assetFiles,setAssetFiles]=useState<ProductFile[]>([]);
  const [assetLoading,setAssetLoading]=useState(false);
  const [assetMessage,setAssetMessage]=useState("");
  const [assetBusy,setAssetBusy]=useState(false);
  const [editingProduct,setEditingProduct]=useState<string|null>(null);
  const [uploadProgress,setUploadProgress]=useState<Record<string,number>>({});
  const [editForm,setEditForm]=useState<Record<string,string|boolean>>({});
  const [createVariantPrices,setCreateVariantPrices]=useState({small:"",medium:"",large:""});
  const [createVariantStock,setCreateVariantStock]=useState({small:"",medium:"",large:""});

  async function load(){setLoading(true);try{const r=await fetch("/api/admin/catalog",{cache:"no-store"});if(!r.ok)throw new Error();setData(await r.json());setMessage("")}catch{setMessage("Unable to load catalog.")}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const rows=useMemo(()=>data.products.filter(p=>[p.name,p.slug,p.category?.name||""].join(" ").toLowerCase().includes(search.trim().toLowerCase())),[data.products,search]);

  async function updateProduct(id:string,patch:Record<string,unknown>){setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});if(!r.ok)throw new Error();setMessage("Product updated.");await load()}catch{setMessage("Unable to update product.")}finally{setSaving(false)}}
  async function updateVariant(productId:string,variantId:string,payload:Record<string,unknown>){
    setSaving(true);setMessage("");
    try{
      const r=await fetch("/api/products/"+productId+"/variants/"+variantId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json().catch(()=>null);
      if(!r.ok)throw new Error(d?.message||"Unable to update size.");
      setMessage("Size and price updated.");
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to update size.")}finally{setSaving(false)}
  }
  async function deleteProduct(id:string,name:string){if(!window.confirm('Permanently delete "'+name+'"? Use Archive instead when the product has historical orders.'))return;setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"DELETE"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"Unable to delete product.");setMessage("Product deleted.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to delete product.")}finally{setSaving(false)}}

  async function createProduct(e:React.FormEvent){
    e.preventDefault();setSaving(true);setMessage("");
    try{
      const slug=form.slug||form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,slug,description:form.description||undefined,categoryId:form.categoryId||undefined,status:form.status,stock:Number(form.stock)||0,isFeatured:form.isFeatured,material:form.material||undefined,scale:form.scale||undefined,dimensions:form.dimensions||undefined,height:form.height||undefined,base:form.base||undefined,packaging:form.packaging||undefined,weight:form.weight||undefined})});
      if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||"Create failed")}
      const p=await r.json();


      const sizeOptions = [
        { name: "Small", price: createVariantPrices.small, stock: createVariantStock.small },
        { name: "Medium", price: createVariantPrices.medium, stock: createVariantStock.medium },
        { name: "Large", price: createVariantPrices.large, stock: createVariantStock.large },
      ];
      for(const sizeOption of sizeOptions){
        const hasPrice = sizeOption.price !== "";
        const hasStock = sizeOption.stock !== "";
        if(!hasPrice && !hasStock) continue;
        const amount = hasPrice ? Number(sizeOption.price) : undefined;
        const stock = hasStock ? Number(sizeOption.stock) : undefined;
        if(amount !== undefined && (!Number.isFinite(amount) || amount < 0)) throw new Error(`${sizeOption.name} price must be a valid number.`);
        if(stock !== undefined && (!Number.isInteger(stock) || stock < 0)) throw new Error(`${sizeOption.name} stock must be a whole number.`);
        const variant = (p.variants || []).find((item: ProductVariant) => item.name === sizeOption.name);
        if(!variant) throw new Error(`${sizeOption.name} size variant was not created.`);
        const payload = { ...(amount !== undefined ? { price: amount } : {}), ...(stock !== undefined ? { stock } : {}) };
        const vr=await fetch("/api/products/"+p.id+"/variants/"+variant.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        if(!vr.ok) throw new Error(`${sizeOption.name} settings could not be saved.`);
      }

      if(productImages.length){
        for(const file of productImages){
          const fd=new FormData();fd.append("file",file);
          const ir=await fetch("/api/products/"+p.id+"/media/upload",{method:"POST",body:fd});
          const id=await ir.json().catch(()=>null);
          if(!ir.ok)throw new Error(id?.message||id?.error||("Product created, but image upload failed for "+file.name));
        }
      }

      if(productGlb){
        const fd=new FormData();fd.append("file",productGlb);
        const gr=await fetch("/api/products/"+p.id+"/files",{method:"POST",body:fd});
        const gd=await gr.json().catch(()=>null);
        if(!gr.ok)throw new Error(gd?.message||gd?.error||"Product created, but GLB upload failed.");

        // Do not publish the raw upload as MODEL_PREVIEW.
        // The processing worker will replace it with the optimized GLB when ready.
      }
      setForm({name:"",slug:"",description:"",categoryId:"",status:"ACTIVE",stock:"0",isFeatured:false,material:"",scale:"",dimensions:"",height:"",base:"",packaging:"",weight:""});
      setProductImages([]);
      setProductGlb(null);
      setCreateVariantPrices({small:"",medium:"",large:""});
      setCreateVariantStock({small:"",medium:"",large:""});
      setMessage("Product created with assets.");
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to create product.")}finally{setSaving(false)}
  }

  function startProductEdit(p:Product){
    setEditingProduct(p.id);setEditForm({name:p.name,slug:p.slug,description:"",categoryId:p.category?.id||"",status:p.status,isFeatured:p.isFeatured,isTrending:p.isTrending,isBestseller:p.isBestseller,badge:"",material:p.material||"",scale:p.scale||"",dimensions:p.dimensions||"",height:p.height||"",base:p.base||"",packaging:p.packaging||"",weight:p.weight||""});
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
    if(!files?.length)return;
    setAssetBusy(true);setAssetMessage("");
    try{
      const list=Array.from(files);
      for(let index=0;index<list.length;index++){
        const file=list[index];
        const fd=new FormData();fd.append("file",file);
        const response=await fetch("/api/products/"+id+"/media/upload",{method:"POST",body:fd});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.message||data?.error||("Unable to upload "+file.name));
        setUploadProgress(prev=>({...prev,[id]:Math.round(((index+1)/list.length)*100)}));
      }
      setAssetMessage(list.length+" image"+(list.length>1?"s":"")+" uploaded successfully.");
      await load();
    }catch(e){setAssetMessage(e instanceof Error?e.message:"Image upload failed.")}
    finally{setAssetBusy(false);setUploadProgress(prev=>{const next={...prev};delete next[id];return next})}
  }
  async function uploadGlb(id:string,file:File|null){
    if(!file)return;
    setAssetBusy(true);setAssetMessage("");
    try{
      if(file.size===0)throw new Error("The selected GLB file is empty.");
      const supported=[".glb",".gltf",".obj",".ply",".stl",".fbx",".abc",".usd",".usda",".usdc",".bvh",".svg",".pdf"]; if(!supported.some(ext=>file.name.toLowerCase().endsWith(ext)))throw new Error("Unsupported model source format.");
      const fd=new FormData();fd.append("file",file);
      const response=await fetch("/api/products/"+id+"/files",{method:"POST",body:fd});
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.message||data?.error||"GLB upload failed");
      if(!data?.storageUrl)throw new Error("GLB upload succeeded but no storage URL was returned.");
      // Keep the raw upload private to the processing pipeline. The worker
      // publishes MODEL_PREVIEW only after optimization + validation succeeds.
      setAssetMessage("Source uploaded. Converting and optimizing to a web-ready GLB…");
      const fr=await fetch("/api/products/"+id+"/files",{cache:"no-store"});if(fr.ok)setAssetFiles(await fr.json());
      await load();
    }catch(e){setAssetMessage(e instanceof Error?e.message:"GLB upload failed.")}
    finally{setAssetBusy(false)}
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
      <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-primary/15 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Size-specific pricing</p><p className="mt-1 text-[9px] text-muted">Set the customer price for each physical size.</p></div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={createVariantPrices.small} onChange={e=>setCreateVariantPrices({...createVariantPrices,small:e.target.value})} type="number" min="0" step="1" placeholder="Small · 15 cm · ₹" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
          <input value={createVariantPrices.medium} onChange={e=>setCreateVariantPrices({...createVariantPrices,medium:e.target.value})} type="number" min="0" step="1" placeholder="Medium · 20 cm · ₹" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
          <input value={createVariantPrices.large} onChange={e=>setCreateVariantPrices({...createVariantPrices,large:e.target.value})} type="number" min="0" step="1" placeholder="Large · 25 cm · ₹" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={createVariantStock.small} onChange={e=>setCreateVariantStock({...createVariantStock,small:e.target.value})} type="number" min="0" step="1" placeholder="Small stock · units" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
          <input value={createVariantStock.medium} onChange={e=>setCreateVariantStock({...createVariantStock,medium:e.target.value})} type="number" min="0" step="1" placeholder="Medium stock · units" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
          <input value={createVariantStock.large} onChange={e=>setCreateVariantStock({...createVariantStock,large:e.target.value})} type="number" min="0" step="1" placeholder="Large stock · units" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>

        </div>
      </div>
      <input value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} type="number" min="0" placeholder="Stock" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="">No category</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option></select>
      <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs sm:col-span-2"/><div className="sm:col-span-2 lg:col-span-4"><p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-muted">Product specifications</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={form.material} onChange={e=>setForm({...form,material:e.target.value})} placeholder="Material" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.scale} onChange={e=>setForm({...form,scale:e.target.value})} placeholder="Scale" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.dimensions} onChange={e=>setForm({...form,dimensions:e.target.value})} placeholder="Dimensions" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.height} onChange={e=>setForm({...form,height:e.target.value})} placeholder="Height" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.base} onChange={e=>setForm({...form,base:e.target.value})} placeholder="Base" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.packaging} onChange={e=>setForm({...form,packaging:e.target.value})} placeholder="Packaging" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} placeholder="Weight" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/></div></div>
      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/> Show in hero</label>

      <div className="rounded-xl border border-dashed border-border bg-background p-3 sm:col-span-2 lg:col-span-2">        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-medium">Product images</p><p className="mt-1 text-[9px] text-muted">JPG, PNG or WebP · multiple images allowed</p></div>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-[10px] font-semibold">
            <IconUpload size={13} className="mr-1 inline"/> Add images
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={saving} onChange={e=>setProductImages(Array.from(e.target.files||[]))}/>
          </label>
        </div>
        {productImages.length>0&&<p className="mt-2 truncate text-[9px] text-muted">{productImages.length} image{productImages.length>1?"s":""} selected · {productImages.map(f=>f.name).join(", ")}</p>}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-background p-3 sm:col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-medium">3D model</p><p className="mt-1 text-[9px] text-muted">GLB · web-ready 3D model for the product viewer</p></div>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-[10px] font-semibold">
            <IconBox size={13} className="mr-1 inline"/> Add 3D source
            <input type="file" accept=".glb,.gltf,.obj,.ply,.stl,.fbx,.abc,.usd,.usda,.usdc,.bvh,.svg,.pdf" className="hidden" disabled={saving} onChange={e=>setProductGlb(e.target.files?.[0]||null)}/>
          </label>
        </div>
        {productGlb&&<p className="mt-2 truncate text-[9px] text-muted">Selected: {productGlb.name}</p>}
      </div>
    </div><Button type="submit" variant="primary" size="sm" disabled={saving} className="mt-4">{saving?"Creating product…":"Create product"}</Button></form>
    <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-3"><IconSearch size={15} className="text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" className="h-10 flex-1 bg-transparent text-xs outline-none"/></div>
    <div className="mt-5 space-y-3">{loading?[1,2,3].map(i=><div key={i} className="h-28 animate-pulse rounded-2xl bg-surface"/>):rows.map(p=><AdminProductCard key={p.id} product={p} saving={saving} editingProduct={editingProduct} assetProductId={assetProductId} assetFiles={assetFiles} assetLoading={assetLoading} assetBusy={assetBusy} assetMessage={assetMessage} uploadProgress={uploadProgress} editForm={editForm} updateProduct={updateProduct} updateVariant={updateVariant} deleteProduct={deleteProduct} startProductEdit={startProductEdit} openAssets={openAssets} uploadImages={uploadImages} uploadGlb={uploadGlb} removeMedia={removeMedia} removeFile={removeFile} setEditingProduct={setEditingProduct} setEditForm={setEditForm} saveProductEdit={saveProductEdit}/>)}{!loading&&!rows.length&&<div className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No products found.</div>}</div>
    {message&&<p className="mt-4 text-xs text-muted">{message}</p>}
  </main>
}