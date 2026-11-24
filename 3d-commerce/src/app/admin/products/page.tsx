"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconRefresh, IconSearch, IconUpload, IconBox } from "@tabler/icons-react";
import AdminProductCard from "@/components/admin/AdminProductCard";
import { AdminToast } from "@/components/admin/AdminToast";
import { Button } from "@/components/ui/Button";
import { CATALOG_MODEL_ACCEPT, uploadConversionDirect, validateCatalogModel, isCatalogConversionActive, type CatalogConversionJob } from "@/lib/conversion-upload";
import { filterProductsByCategory, getMainCategories, getSubcategories } from "@/lib/category-hierarchy.mjs";

type ProductVariant={id:string;name:string;size?:string|null;sku?:string|null;isActive:boolean;price?:{amountMinor:number;compareAtMinor?:number|null;priceOverrideMinor?:number|null;isActive:boolean}|null};
type Product={id:string;name:string;slug:string;description?:string|null;badge?:string|null;status:string;ordersEnabled:boolean;isFeatured:boolean;isTrending:boolean;isBestseller:boolean;category?:{id:string;name:string}|null;prices:any[];variants?:ProductVariant[];material?:string|null;dimensions?:string|null;height?:string|null;base?:string|null;packaging?:string|null;weight?:string|null;media?:Array<{id:string;type:string;url:string;altText?:string|null;isPrimary:boolean;sortOrder:number}>};
type ProductFile={id:string;originalName:string;storageUrl:string;format:string;fileType:string;mimeType:string;fileSize:string|number;processingStatus:string};
type Category={id:string;name:string;slug:string;parentId?:string|null;parent?:{id:string;name:string;slug:string}|null};

export default function AdminProducts(){
  const [data,setData]=useState<{products:Product[];categories:Category[];materialPricingRules:Array<{material:string;sizeKey:string;amountMinor:number;currency:string}>}>({products:[],categories:[],materialPricingRules:[]});
  const [search,setSearch]=useState(""); const [mainCategoryFilter,setMainCategoryFilter]=useState("all"); const [subcategoryFilter,setSubcategoryFilter]=useState("all"); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  const [form,setForm]=useState({name:"",slug:"",description:"",categoryId:"",parentCategoryId:"",status:"ACTIVE",ordersEnabled:true,isFeatured:false,hasSizes:true,fixedWeight:"",material:"",dimensions:"",height:"",base:"",packaging:"",weight:""});
  const [editParentCategoryId,setEditParentCategoryId]=useState("");
  const [productImages,setProductImages]=useState<File[]>([]);
  const [productGlb,setProductGlb]=useState<File|null>(null);
  const [conversionJobs,setConversionJobs]=useState<Record<string,CatalogConversionJob>>({});
  const [conversionStatusError,setConversionStatusError]=useState("");
  const [assetProductId,setAssetProductId]=useState<string|null>(null);
  const [assetFiles,setAssetFiles]=useState<ProductFile[]>([]);
  const [assetLoading,setAssetLoading]=useState(false);
  const [assetMessage,setAssetMessage]=useState("");
  const [assetBusy,setAssetBusy]=useState(false);
  const [editingProduct,setEditingProduct]=useState<string|null>(null);
  const [uploadProgress,setUploadProgress]=useState<Record<string,number>>({});
  const [editForm,setEditForm]=useState<Record<string,string|boolean>>({});

  async function load(){setLoading(true);try{const r=await fetch("/api/admin/catalog",{cache:"no-store"});if(!r.ok)throw new Error();setData(await r.json());return true}catch{setMessage("Unable to load catalog.");return false}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  function refreshCatalog(){window.location.reload()}
  // Conversion jobs are persisted by the backend, so the catalog can resume
  // showing progress after a reload instead of relying on a temporary file row.
  useEffect(()=>{
    let cancelled=false;
    let inFlight=false;
    async function refreshJobs(){
      if(inFlight)return;
      inFlight=true;
      try{
        const response=await fetch("/api/3d-conversion",{cache:"no-store"});
        if(!response.ok)throw new Error("Unable to refresh model conversion status.");
        const jobs=await response.json() as CatalogConversionJob[];
        if(cancelled)return;
        const latest:Record<string,CatalogConversionJob>={};
        for(const job of jobs){
          if(job.targetProductId&&!latest[job.targetProductId])latest[job.targetProductId]=job;
        }
        setConversionJobs(latest);
        setConversionStatusError("");
      }catch{
        if(!cancelled)setConversionStatusError("Model conversion status is temporarily unavailable. Refresh to retry.");
      }finally{inFlight=false}
    }
    void refreshJobs();
    const timer=window.setInterval(()=>void refreshJobs(),5000);
    return ()=>{cancelled=true;window.clearInterval(timer)};
  },[]);
  const selectedJob=assetProductId?conversionJobs[assetProductId]:undefined;
  useEffect(()=>{
    if(!assetProductId || selectedJob?.stage!=="PUBLISHED")return;
    let cancelled=false;
    async function refreshPublished(){
      const [files,catalog]=await Promise.all([
        fetch("/api/products/"+assetProductId+"/files",{cache:"no-store"}),
        fetch("/api/admin/catalog",{cache:"no-store"}),
      ]);
      if(files.ok){const result=await files.json();if(!cancelled)setAssetFiles(result)}
      if(catalog.ok){const result=await catalog.json();if(!cancelled)setData(result)}
    }
    void refreshPublished().catch(()=>undefined);
    return ()=>{cancelled=true};
  },[assetProductId,selectedJob?.id,selectedJob?.stage]);

  async function queueCatalogModel(productId:string,file:File){
    validateCatalogModel(file);
    setUploadProgress(prev=>({...prev,[productId]:0}));
    try{
      const job=await uploadConversionDirect(file,percent=>setUploadProgress(prev=>({...prev,[productId]:percent})),undefined,{targetProductId:productId,optimizationPreset:"BALANCED"}) as CatalogConversionJob;
      if(!job?.id)throw new Error("Conversion job was not returned. Refresh the catalog before retrying.");
      setConversionJobs(prev=>({...prev,[productId]:job}));
      return job;
    }finally{
      setUploadProgress(prev=>{const next={...prev};delete next[productId];return next});
    }
  }

  async function retryCatalogModel(productId:string){
    const job=conversionJobs[productId];
    if(!job||assetBusy)return;
    setAssetBusy(true);setAssetMessage("");
    try{
      const action=job.status==="FAILED"?"retry":"publish";
      const r=await fetch("/api/3d-conversion/"+encodeURIComponent(job.id)+"/"+action,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(action==="publish"?{productId}:{}),
      });
      const result=await r.json().catch(()=>null);
      if(!r.ok)throw new Error(result?.message||result?.error||"Unable to retry conversion.");
      setConversionJobs(prev=>({...prev,[productId]:result}));
      setAssetMessage(action==="publish"?"Optimized model attached.":"Conversion queued again.");
    }catch(error){setAssetMessage(error instanceof Error?error.message:"Unable to retry conversion.")}
    finally{setAssetBusy(false)}
  }

  const rows=useMemo(()=>filterProductsByCategory(
    data.products,
    data.categories,
    mainCategoryFilter,
    subcategoryFilter,
  ).filter(p=>[p.name,p.slug,p.category?.name||""].join(" ").toLowerCase().includes(search.trim().toLowerCase())),[data.products,data.categories,search,mainCategoryFilter,subcategoryFilter]);
  const mainCategories=useMemo(()=>getMainCategories(data.categories),[data.categories]);
  const filteredSubcategories=useMemo(()=>getSubcategories(data.categories,mainCategoryFilter),[data.categories,mainCategoryFilter]);
  const subcategoriesFor=(parentId:string)=>data.categories.filter(category=>category.parentId===parentId);

  async function updateProduct(id:string,patch:Record<string,unknown>){setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(Array.isArray(d?.message)?d.message.join(", "):d?.message||"Unable to update product.")}setMessage("Product updated.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to update product.")}finally{setSaving(false)}}
  async function updateProductPrice(productId:string,payload:{currency:string;amountMinor:number;compareAtMinor:number|null}){
    setSaving(true);setMessage("");
    try{
      const r=await fetch("/api/products/"+productId+"/pricing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json().catch(()=>null);
      if(!r.ok)throw new Error(d?.message||"Unable to save product price.");
      setMessage("Product price saved.");
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to save product price.")}finally{setSaving(false)}
  }

  async function updateVariants(productId:string,items:Array<{variantId:string;payload:Record<string,unknown>}>){
    setSaving(true);setMessage("");
    try{
      // Save every size, then reload once so all three calculated prices appear together.
      for(const item of items){
        const r=await fetch("/api/products/"+productId+"/variants/"+item.variantId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.payload)});
        const d=await r.json().catch(()=>null);
        if(!r.ok)throw new Error(d?.message||"Unable to update sizes.");
      }
      setMessage("All sizes saved. Selling prices recalculated from weights.");
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to update sizes.");await load()}finally{setSaving(false)}
  }
  async function ensureStandardVariants(productId:string){
    setSaving(true);setMessage("");
    try{
      const defaults=[{name:"Small",size:"20 cm"},{name:"Medium",size:"25 cm"},{name:"Large",size:"30 cm"}];
      for(const variant of defaults){
        const response=await fetch("/api/products/"+productId+"/variants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(variant)});
        const result=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(result?.message||("Unable to create "+variant.name+" size."));
      }
      setMessage("Standard sizes added. You can now set each size price below.");
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to add standard sizes.");await load()}
    finally{setSaving(false)}
  }
  async function deleteProduct(id:string,name:string){if(!window.confirm('Permanently delete "'+name+'"? Use Archive instead when the product has historical orders.'))return;setSaving(true);try{const r=await fetch("/api/products/"+id,{method:"DELETE"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"Unable to delete product.");setMessage("Product deleted.");await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to delete product.")}finally{setSaving(false)}}

  async function createProduct(e:React.FormEvent){
    e.preventDefault();setSaving(true);setMessage("");
    try{
      if(productGlb)validateCatalogModel(productGlb);
      const fixedWeightGrams=form.hasSizes?undefined:Number(form.fixedWeight);
      if(!form.hasSizes&&!(Number.isFinite(fixedWeightGrams)&&(fixedWeightGrams??0)>0))throw new Error("Enter the model weight in grams for a product without sizes.");
      const slug=form.slug||form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      if(data.products.some(product=>product.slug===slug))throw new Error(`A product with the slug "${slug}" already exists. Change the name or slug and try again.`);
      const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,slug,description:form.description||undefined,categoryId:form.categoryId||undefined,status:form.status,ordersEnabled:true,hasSizes:form.hasSizes,fixedWeightGrams,isFeatured:form.isFeatured,material:form.material||undefined,dimensions:form.dimensions||undefined,height:form.height||undefined,base:form.base||undefined,packaging:form.packaging||undefined,weight:form.weight||undefined})});
      if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||"Create failed")}
      const p=await r.json();




      if(productImages.length){
        for(const file of productImages){
          const fd=new FormData();fd.append("file",file);
          const ir=await fetch("/api/products/"+p.id+"/media/upload",{method:"POST",body:fd});
          const id=await ir.json().catch(()=>null);
          if(!ir.ok)throw new Error(id?.message||id?.error||("Product created, but image upload failed for "+file.name));
        }
      }

      let modelMessage="";
      if(productGlb){
        try{
          await queueCatalogModel(p.id,productGlb);
          modelMessage=" 3D conversion queued; the optimized GLB will attach automatically.";
        }catch(error){
          modelMessage=" Product created, but model upload failed: "+(error instanceof Error?error.message:"Unknown error")+". Retry from Manage photos & 3D.";
        }
      }
      setForm({name:"",slug:"",description:"",categoryId:"",parentCategoryId:"",status:"ACTIVE",ordersEnabled:true,isFeatured:false,hasSizes:true,fixedWeight:"",material:"",dimensions:"",height:"",base:"",packaging:"",weight:""});
      setProductImages([]);
      setProductGlb(null);
      setMessage(`Product "${p.name??form.name}" was created successfully.`+modelMessage);
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to create product.")}finally{setSaving(false)}
  }

  function startProductEdit(p:Product){
    setEditingProduct(p.id);const productCategory=data.categories.find(category=>category.id===p.category?.id);const parentId=productCategory?.parentId||productCategory?.id||"";setEditParentCategoryId(parentId);setEditForm({name:p.name,slug:p.slug,description:p.description||"",categoryId:p.category?.id||"",status:p.status,ordersEnabled:p.ordersEnabled,isFeatured:p.isFeatured,isTrending:p.isTrending,isBestseller:p.isBestseller,badge:p.badge||"",material:p.material||"",dimensions:p.dimensions||"",height:p.height||"",base:p.base||"",packaging:p.packaging||"",weight:p.weight||""});
  }
  async function saveProductEdit(id:string){
    setSaving(true);setMessage("");
    try{const payload={...editForm,name:String(editForm.name).trim(),slug:String(editForm.slug).trim(),description:String(editForm.description||""),categoryId:String(editForm.categoryId||"")||undefined,status:String(editForm.status),ordersEnabled:Boolean(editForm.ordersEnabled),isFeatured:Boolean(editForm.isFeatured),isTrending:Boolean(editForm.isTrending),isBestseller:Boolean(editForm.isBestseller),badge:String(editForm.badge||"")||undefined,material:String(editForm.material||"")||undefined,dimensions:String(editForm.dimensions||"")||undefined,height:String(editForm.height||"")||undefined,base:String(editForm.base||"")||undefined,packaging:String(editForm.packaging||"")||undefined,weight:String(editForm.weight||"")||undefined};const r=await fetch("/api/products/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||"Unable to update product");setMessage("Product updated.");setEditingProduct(null);await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to update product")}finally{setSaving(false)}
  }

  async function openAssets(id:string){
    if(assetBusy)return;
    setAssetMessage("");
    setAssetFiles([]);
    setAssetLoading(assetProductId!==id);
    setAssetProductId(assetProductId===id?null:id);
  }

  useEffect(()=>{
    if(!assetProductId)return;
    const controller=new AbortController();
    const id=assetProductId;
    setAssetLoading(true);
    void fetch("/api/products/"+encodeURIComponent(id)+"/files",{cache:"no-store",signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error("Unable to load 3D assets.");
        const files=await response.json();
        if(!controller.signal.aborted)setAssetFiles(files);
      })
      .catch(()=>{if(!controller.signal.aborted)setAssetMessage("Unable to load 3D assets.")})
      .finally(()=>{if(!controller.signal.aborted)setAssetLoading(false)});
    return ()=>controller.abort();
  },[assetProductId]);
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
    if(!file||assetBusy||isCatalogConversionActive(conversionJobs[id]))return;
    setAssetBusy(true);setAssetMessage("");
    try{
      await queueCatalogModel(id,file);
      setAssetMessage("Source uploaded. Conversion and optimization are queued; the optimized GLB will attach automatically.");
    }catch(error){
      setAssetMessage(error instanceof Error?error.message:"3D source upload failed.");
    }finally{setAssetBusy(false)}
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
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">Catalog</p><h1 className="mt-2 font-serif text-4xl">Products</h1><p className="mt-2 text-sm text-muted">Create products, manage order availability, prices and product assets.</p></div><button type="button" onClick={()=>void refreshCatalog()} disabled={loading} aria-label="Refresh product list" title="Refresh product list" className="rounded-xl border border-border p-2 text-muted transition hover:text-foreground disabled:cursor-wait disabled:opacity-60"><IconRefresh size={16} className={loading?"animate-spin":undefined}/></button></div>
    <form onSubmit={createProduct} className="mt-7 rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2 text-xs font-semibold"><IconPlus size={16} className="text-primary"/> Add product</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Product name" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="Slug (optional)" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/>
      <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-border bg-background/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Made to order · size pricing</p>
            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-muted">Every order is produced after purchase. Set each size&apos;s measured or estimated weight in the variant editor; material and manufacturing rates calculate its selling price automatically.</p>
          </div>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-medium text-emerald-300">No stock limits · pause per product or category</span>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[11px]"><input type="checkbox" checked={form.hasSizes} onChange={e=>setForm({...form,hasSizes:e.target.checked})}/>Sell in sizes (Small / Medium / Large). Untick for one fixed size priced like Medium</label>
        {!form.hasSizes&&<label className="mt-2 block max-w-xs"><span className="text-[9px] text-muted">Model weight (grams) · price = filament from weight + Medium charges + global charges, calculated automatically</span><input type="number" min="0.01" step="0.01" required value={form.fixedWeight} onChange={e=>setForm({...form,fixedWeight:e.target.value})} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-[10px]"/></label>}
        <p className="mt-3 text-[10px] text-muted">Manage material rates and fixed size costs in Admin → Promotions & tax.</p>
      </div>
      <div className="grid gap-2">
        <select value={form.parentCategoryId} onChange={e=>setForm({...form,parentCategoryId:e.target.value,categoryId:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="">Choose main category</option>{mainCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {form.parentCategoryId ? (
          subcategoriesFor(form.parentCategoryId).length ? (
            <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} aria-label="Choose product subcategory" className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
              <option value={form.parentCategoryId}>Use main category (no subcategory)</option>
              {subcategoriesFor(form.parentCategoryId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <p className="flex min-h-10 items-center rounded-xl border border-border bg-surface/50 px-3 text-xs text-muted">No subcategories available. The product will use the selected main category.</p>
          )
        ) : (
          <p className="flex min-h-10 items-center rounded-xl border border-border bg-surface/50 px-3 text-xs text-muted">Select a main category to see its subcategories.</p>
        )}
      </div>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option></select>
      <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs sm:col-span-2"/><div className="sm:col-span-2 lg:col-span-4"><p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-muted">Product specifications</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select value={form.material} onChange={e=>setForm({...form,material:e.target.value})} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="">Select material</option>{[...new Set((data.materialPricingRules??[]).map(rule=>rule.material))].map(material=><option key={material} value={material}>{material}</option>)}</select><input value={form.dimensions} onChange={e=>setForm({...form,dimensions:e.target.value})} placeholder="Dimensions" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.height} onChange={e=>setForm({...form,height:e.target.value})} placeholder="Height" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.base} onChange={e=>setForm({...form,base:e.target.value})} placeholder="Base" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.packaging} onChange={e=>setForm({...form,packaging:e.target.value})} placeholder="Packaging" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/><input value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} placeholder="Weight" className="h-10 rounded-xl border border-border bg-background px-3 text-xs"/></div></div>
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
          <div><p className="text-xs font-medium">3D model</p><p className="mt-1 text-[9px] text-muted">GLB, STL, OBJ, 3MF, FBX and more · automatically converted and optimized</p></div>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-[10px] font-semibold">
            <IconBox size={13} className="mr-1 inline"/> Add 3D source
            <input type="file" accept={CATALOG_MODEL_ACCEPT} className="hidden" disabled={saving} onChange={e=>setProductGlb(e.target.files?.[0]||null)}/>
          </label>
        </div>
        {productGlb&&<p className="mt-2 truncate text-[9px] text-muted">Selected: {productGlb.name}</p>}
        {productGlb&&saving&&Object.values(uploadProgress).length>0&&<p className="mt-2 text-xs text-muted">Uploading source… {Math.max(...Object.values(uploadProgress))}%</p>}
        <p className="mt-2 text-[10px] text-muted">Only the finished web-ready GLB is attached. Use a ZIP for files with external textures or buffers.</p>
      </div>
    </div><Button type="submit" variant="primary" size="sm" disabled={saving} className="mt-4">{saving?"Creating product…":"Create product"}</Button></form>
    <div className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]"><div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3"><IconSearch size={15} className="text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" className="h-10 flex-1 bg-transparent text-xs outline-none"/></div><div className="grid gap-2 sm:grid-cols-2"><select aria-label="Filter products by main category" value={mainCategoryFilter} onChange={e=>{setMainCategoryFilter(e.target.value);setSubcategoryFilter("all")}} className="h-10 min-w-0 rounded-xl border border-border bg-surface px-3 text-xs"><option value="all">All main categories</option>{mainCategories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select><select aria-label="Filter products by subcategory" value={subcategoryFilter} disabled={mainCategoryFilter==="all" || filteredSubcategories.length===0} onChange={e=>setSubcategoryFilter(e.target.value)} className="h-10 min-w-0 rounded-xl border border-border bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"><option value="all">{mainCategoryFilter==="all"?"Choose main category first":filteredSubcategories.length===0?"No subcategories":"All subcategories"}</option>{filteredSubcategories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div>
    {conversionStatusError&&<p role="status" className="mt-3 text-xs text-amber-400">{conversionStatusError}</p>}
    <div className="mt-5 space-y-3">{loading?[1,2,3].map(i=><div key={i} className="h-28 animate-pulse rounded-2xl bg-surface"/>):rows.map(p=><AdminProductCard key={p.id} product={p} categories={data.categories} materials={[...new Set((data.materialPricingRules??[]).map(rule=>rule.material))]} parentCategoryId={editParentCategoryId} setParentCategoryId={setEditParentCategoryId} saving={saving} editingProduct={editingProduct} assetProductId={assetProductId} assetFiles={assetFiles} assetLoading={assetLoading} assetBusy={assetBusy} assetMessage={assetMessage} uploadProgress={uploadProgress} editForm={editForm} updateProduct={updateProduct} updateProductPrice={updateProductPrice} updateVariants={updateVariants} ensureStandardVariants={ensureStandardVariants} deleteProduct={deleteProduct} startProductEdit={startProductEdit} openAssets={openAssets} uploadImages={uploadImages} uploadGlb={uploadGlb} conversionJob={conversionJobs[p.id]} retryConversion={()=>void retryCatalogModel(p.id)} removeMedia={removeMedia} removeFile={removeFile} setEditingProduct={setEditingProduct} setEditForm={setEditForm} saveProductEdit={saveProductEdit}/>)}{!loading&&!rows.length&&<div className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No products found.</div>}</div>
    <AdminToast message={message} onDismiss={()=>setMessage("")}/>
  </main>
}