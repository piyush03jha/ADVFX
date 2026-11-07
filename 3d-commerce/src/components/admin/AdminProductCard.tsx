"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { IconArchive, IconBox, IconEdit, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { resolveMediaUrl } from "@/lib/media-url";

// A freshly uploaded image can briefly 404 while the API publishes it (or while a
// CDN holds a stale answer). Retry a few times with a cache-busting query instead of
// leaving a broken image with only its alt text.
const THUMB_RETRY_DELAYS_MS = [1200, 2500, 5000, 9000];

function AdminThumb({ src, alt }: { src: string; alt: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!failed) return;
    if (attempt >= THUMB_RETRY_DELAYS_MS.length) return;
    const timer = window.setTimeout(() => {
      setAttempt((current) => current + 1);
      setFailed(false);
    }, THUMB_RETRY_DELAYS_MS[attempt]);
    return () => window.clearTimeout(timer);
  }, [failed, attempt]);

  const url = attempt === 0 ? src : src + (src.includes("?") ? "&" : "?") + "retry=" + attempt;
  const gaveUp = failed && attempt >= THUMB_RETRY_DELAYS_MS.length;

  return gaveUp ? (
    <div className="flex aspect-square w-full items-center justify-center bg-surface p-2 text-center text-[9px] text-muted">Preview unavailable</div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className="aspect-square w-full object-cover" />
  );
}

type ProductVariant={id:string;name:string;size?:string|null;weightGrams?:number|null;sku?:string|null;isActive:boolean;price?:{amountMinor:number;compareAtMinor?:number|null;priceOverrideMinor?:number|null;isActive:boolean}|null};
type Product={id:string;name:string;slug:string;status:string;ordersEnabled:boolean;hasSizes?:boolean;fixedWeightGrams?:number|null;isFeatured:boolean;isTrending:boolean;isBestseller:boolean;category?:{id:string;name:string;ordersEnabled?:boolean;gstRateBps?:number|null;parentId?:string|null;parent?:{id:string;name:string;slug?:string;ordersEnabled?:boolean}|null}|null;prices:Array<{amountMinor:number;currency?:string;compareAtMinor?:number|null;isActive:boolean}>;variants?:ProductVariant[];material?:string|null;scale?:string|null;dimensions?:string|null;height?:string|null;base?:string|null;packaging?:string|null;weight?:string|null;media?:Array<{id:string;type:string;url:string;altText?:string|null;isPrimary:boolean;sortOrder:number}>};
type ProductFile={id:string;originalName:string;storageUrl:string;format:string;fileType:string;mimeType:string;fileSize:string|number;processingStatus:string};
type CategoryOption={id:string;name:string;slug:string;parentId?:string|null;parent?:{id:string;name:string;slug:string}|null};

type Props={product:Product;categories:CategoryOption[];materials:string[];parentCategoryId:string;setParentCategoryId:(value:string)=>void;saving:boolean;editingProduct:string|null;assetProductId:string|null;assetFiles:ProductFile[];assetLoading:boolean;assetBusy:boolean;assetMessage:string;uploadProgress:Record<string,number>;editForm:Record<string,string|boolean>;updateProduct:(id:string,patch:Record<string,unknown>)=>Promise<void>;updateProductPrice:(id:string,payload:{currency:string;amountMinor:number;compareAtMinor:number|null})=>Promise<void>;updateVariants:(productId:string,items:Array<{variantId:string;payload:Record<string,unknown>}>)=>Promise<void>;ensureStandardVariants:(productId:string)=>Promise<void>;deleteProduct:(id:string,name:string)=>Promise<void>;startProductEdit:(p:Product)=>void;openAssets:(id:string)=>Promise<void>;uploadImages:(id:string,files:FileList|null)=>Promise<void>;uploadGlb:(id:string,file:File|null)=>Promise<void>;removeMedia:(id:string,mediaId:string)=>Promise<void>;removeFile:(id:string,fileId:string)=>Promise<void>;setEditingProduct:(id:string|null)=>void;setEditForm:Dispatch<SetStateAction<Record<string,string|boolean>>>;saveProductEdit:(id:string)=>Promise<void>};

export default function AdminProductCard({product:p,...props}:Props){const {categories,materials,parentCategoryId,setParentCategoryId,saving,editingProduct,assetProductId,assetFiles,assetLoading,assetBusy,assetMessage,uploadProgress,editForm,updateProduct,updateProductPrice,updateVariants,ensureStandardVariants,deleteProduct,startProductEdit,openAssets,uploadImages,uploadGlb,removeMedia,removeFile,setEditingProduct,setEditForm,saveProductEdit}=props;return <article key={p.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">{p.name}</p><p className="mt-1 text-[10px] text-muted">{p.slug} · {p.category?.name||"Uncategorized"}{p.category?.gstRateBps!=null?` · GST ${(p.category.gstRateBps/100).toFixed(2)}% included`:""}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] text-primary">{p.status}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Order availability</p><button onClick={()=>void updateProduct(p.id,{ordersEnabled:!p.ordersEnabled})} disabled={saving} className={`mt-1 rounded-lg border px-2.5 py-1.5 text-[9px] ${p.ordersEnabled?"border-emerald-500/25 text-emerald-300":"border-red-500/25 text-red-300"}`}>{p.ordersEnabled?"Accepting orders · Pause":"Orders paused · Resume"}</button>{(p.category?.ordersEnabled===false||p.category?.parent?.ordersEnabled===false)&&<p className="mt-1 text-[9px] text-red-300">Shown as not accepting orders: category &ldquo;{p.category?.ordersEnabled===false?p.category.name:p.category?.parent?.name}&rdquo; is paused. Resume it in Categories.</p>}</div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Sizes</p><button onClick={()=>{const on=p.hasSizes!==false;if(!on){void updateProduct(p.id,{hasSizes:true});return;}const w=window.prompt("Turn sizes off? The product is then one fixed size priced like Medium from its weight. Enter the model weight in grams:",p.fixedWeightGrams?String(p.fixedWeightGrams):"");if(w===null)return;const grams=Number(w);if(!(Number.isFinite(grams)&&grams>0)){window.alert("Enter a positive weight in grams.");return;}void updateProduct(p.id,{hasSizes:false,fixedWeightGrams:grams});}} disabled={saving} className={`mt-1 rounded-lg border px-2.5 py-1.5 text-[9px] ${p.hasSizes!==false?"border-emerald-500/25 text-emerald-300":"border-border text-muted"}`}>{p.hasSizes!==false?"Sizes on · Turn off":"Sizes off · Turn on"}</button></div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Hero</p><button onClick={()=>void updateProduct(p.id,{isFeatured:!p.isFeatured})} disabled={saving} className="mt-1 rounded-lg border border-border px-2.5 py-1.5 text-[9px]">{p.isFeatured?"Remove from hero":"Feature in hero"}</button></div>
        <div className="flex items-end justify-end gap-2"><button onClick={()=>startProductEdit(p)} disabled={saving} title="Edit product" className="rounded-lg border border-border p-2 text-muted"><IconEdit size={14}/></button><button onClick={()=>void updateProduct(p.id,{status:"ARCHIVED"})} disabled={saving||p.status==="ARCHIVED"} title="Archive product" className="rounded-lg border border-border p-2 text-muted"><IconArchive size={14}/></button><button onClick={()=>void deleteProduct(p.id,p.name)} disabled={saving} title="Permanently delete product" className="rounded-lg border border-red-400/20 p-2 text-red-300"><IconTrash size={14}/></button></div>
      </div>
      {p.hasSizes!==false&&(p.variants||[]).length===0&&(
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Product-level price</p>
            <p className="mt-1 text-[10px] text-muted">Single price used for products without a size variant. Sized products are priced per size from manufacturing pricing.</p>
            {p.prices?.find(price=>price.isActive)&&<p className="mt-1 text-[10px] font-medium">Product price: {p.prices.find(price=>price.isActive)?.currency||"INR"} {((p.prices.find(price=>price.isActive)?.amountMinor||0)/100).toFixed(2)}</p>}
          </div>
        </div>
        <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const currency=String(fd.get("currency")||"INR").trim().toUpperCase();const amount=Number(fd.get("amount"));const compareRaw=String(fd.get("compareAt")||"").trim();const compare=compareRaw===""?null:Number(compareRaw);if(!Number.isFinite(amount)||amount<0||!Number.isFinite(compare===null?0:compare))return;void updateProductPrice(p.id,{currency,amountMinor:Math.round(amount*100),compareAtMinor:compare===null?null:Math.round(compare*100)})}} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input name="currency" required defaultValue="INR" maxLength={3} pattern="[A-Za-z]{3}" placeholder="Currency" className="h-9 rounded-lg border border-border bg-background px-2 text-[10px]"/>
          <input name="amount" required type="number" min="0" step="0.01" placeholder="Selling price" className="h-9 rounded-lg border border-border bg-background px-2 text-[10px]"/>
          <input name="compareAt" type="number" min="0" step="0.01" placeholder="Compare-at price" className="h-9 rounded-lg border border-border bg-background px-2 text-[10px]"/>
          <button disabled={saving} className="rounded-lg bg-foreground px-3 py-2 text-[10px] font-semibold text-background">{saving?"Saving…":"Save price"}</button>
        </form>
      </div>
      )}
      {p.hasSizes===false&&<div className="mt-4 border-t border-border pt-4">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Fixed size · weight-based price</p>
        <p className="mt-1 text-[10px] text-muted">No sizes: customers see one price and no size picker. Price = filament from the weight below + Medium-size charges + global charges, recalculated automatically.</p>
        <p className="mt-1 text-[10px] font-medium">{p.prices?.find(price=>price.isActive)?`Calculated price: ${p.prices.find(price=>price.isActive)?.currency||"INR"} ${((p.prices.find(price=>price.isActive)?.amountMinor||0)/100).toFixed(2)}`:"No price yet. Set a weight (and a material with pricing rules)."}</p>
        <form onSubmit={e=>{e.preventDefault();const g=Number(new FormData(e.currentTarget).get("grams"));if(!(Number.isFinite(g)&&g>0))return;void updateProduct(p.id,{fixedWeightGrams:g});}} className="mt-2 flex flex-wrap items-center gap-2">
          <input name="grams" required type="number" min="0.01" step="0.01" defaultValue={p.fixedWeightGrams??""} placeholder="Weight (g)" className="h-9 w-32 rounded-lg border border-border bg-background px-2 text-[10px]"/>
          <button disabled={saving} className="rounded-lg bg-foreground px-3 py-2 text-[10px] font-semibold text-background">{saving?"Saving…":"Save weight & recalculate"}</button>
        </form>
      </div>}
      {p.hasSizes!==false&&(
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Size-specific pricing</p><p className="mt-1 text-[10px] text-muted">Prices are calculated from material and weight. To set your own price for a size, enter it in the Override price box for that size; clear the box to go back to the calculated price.</p></div>
        </div>
        {(p.variants||[]).length===0 ? <div className="mt-3 rounded-xl border border-dashed border-border p-4"><p className="text-xs text-muted">This product has no size variants yet, so there are no price fields to edit. Add standard sizes to enable size-specific pricing.</p><button type="button" onClick={()=>void ensureStandardVariants(p.id)} disabled={saving} className="mt-3 rounded-lg bg-foreground px-3 py-2 text-[10px] font-semibold text-background">{saving?"Adding sizes…":"Add standard sizes & enable pricing"}</button></div> : <form key={(p.variants||[]).map(v=>v.id+":"+(v.size??"")+":"+(v.weightGrams??"")+":"+(v.price?.amountMinor??"")+":"+(v.price?.priceOverrideMinor??"")).join("|")} onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);void updateVariants(p.id,(p.variants||[]).map(v=>({variantId:v.id,payload:{name:String(fd.get("name_"+v.id)||""),size:fd.get("sizeCm_"+v.id)===""?"":Number(fd.get("sizeCm_"+v.id))+" cm",weightGrams:fd.get("weightGrams_"+v.id)===""?null:Number(fd.get("weightGrams_"+v.id)),priceOverride:fd.get("override_"+v.id)===""?null:Number(fd.get("override_"+v.id))}})))}} className="mt-3">
        <div className="grid gap-2 lg:grid-cols-3">
          {(p.variants||[]).map(v=><div key={v.id} className="rounded-xl border border-border bg-background/50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input name={"name_"+v.id} defaultValue={v.name} placeholder="Name" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <label className="flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[10px]"><input name={"sizeCm_"+v.id} defaultValue={Number.isFinite(parseFloat(v.size||""))?String(parseFloat(v.size||"")):""} type="number" min="1" step="0.1" placeholder="Size" aria-label={v.name+" size in cm"} className="w-full min-w-0 bg-transparent outline-none"/><span className="text-muted">cm</span></label>
              <input name={"weightGrams_"+v.id} defaultValue={v.weightGrams==null?"":String(v.weightGrams)} type="number" min="0.01" step="0.01" placeholder="Model weight · grams" className="col-span-2 h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <div className="col-span-2 rounded-lg border border-border bg-surface px-2 py-2">
                <p className="text-[9px] text-muted">{v.price?.priceOverrideMinor!=null?"Custom selling price (manual)":"Calculated selling price"} · GST inclusive</p>
                <p className="mt-0.5 text-xs font-semibold">{v.price?.isActive?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format((v.price.amountMinor||0)/100):"Configure manufacturing pricing"}</p>
              </div>
              <label className="col-span-2 block">
                <span className="text-[9px] text-muted">Override price (₹, GST incl.) · leave blank to use the calculated price</span>
                <input name={"override_"+v.id} defaultValue={v.price?.priceOverrideMinor==null?"":String(v.price.priceOverrideMinor/100)} type="number" min="0" step="0.01" placeholder="Auto" className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-[10px]"/>
              </label>
            </div>
            <div className="mt-2">
              <span className="text-[9px] text-muted">{v.isActive?"Active":"Inactive"} · Made to order</span>
            </div>
          </div>)}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-lg bg-foreground px-3 py-2 text-[10px] font-semibold text-background disabled:opacity-60">{saving?"Saving…":"Save all sizes & recalculate prices"}</button>
        </div>
        </form>}
      </div>
      )}
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
                {(p.media||[]).filter(m=>m.type==="IMAGE").map(m=><div key={m.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface"><AdminThumb src={resolveMediaUrl(m.url) ?? "/placeholder-product.webp"} alt={m.altText||p.name} /><button onClick={()=>void removeMedia(p.id,m.id)} disabled={assetBusy} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"><IconX size={12}/></button>{m.isPrimary&&<span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] text-white">Primary</span>}</div>)}
                {!p.media?.some(m=>m.type==="IMAGE")&&<p className="col-span-3 rounded-lg border border-dashed border-border p-6 text-center text-[10px] text-muted">No product photos yet.</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold">3D model</p><p className="mt-1 text-[10px] text-muted">Upload the web-ready GLB directly. It is stored as-is; no conversion or compression runs.</p></div><label className="cursor-pointer rounded-lg bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background"><IconBox size={13} className="mr-1 inline"/>Upload source<input type="file" accept=".glb" className="hidden" disabled={assetBusy} onChange={e=>{void uploadGlb(p.id,e.target.files?.[0]||null);e.currentTarget.value=""}}/></label></div>
              <div className="mt-3 space-y-2">{assetLoading?<p className="text-[10px] text-muted">Loading 3D assets…</p>:assetFiles.map(f=><div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"><div className="min-w-0"><p className="truncate text-[10px] font-medium">{f.originalName}</p><p className="text-[9px] text-muted">{f.format} · {f.processingStatus} · {typeof f.fileSize==="number"?Math.round(f.fileSize/1024/1024*10)/10:f.fileSize} bytes</p></div><button onClick={()=>void removeFile(p.id,f.id)} disabled={assetBusy} className="rounded-lg border border-red-400/20 p-1.5 text-red-300" title="Delete GLB"><IconTrash size={13}/></button></div>)}{!assetLoading&&!assetFiles.length&&<p className="rounded-lg border border-dashed border-border p-6 text-center text-[10px] text-muted">No 3D files uploaded yet.</p>}</div>
            </div>
          </div>
          {assetBusy&&uploadProgress[p.id]!==undefined&&<div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[9px] text-muted"><span>Uploading images…</span><span>{uploadProgress[p.id]}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-foreground transition-all" style={{width:uploadProgress[p.id]+"%"}} /></div>
          </div>}
          {assetMessage&&<p className="mt-3 text-[10px] text-muted">{assetMessage}</p>}
        </div>}
      </div>
      {editingProduct===p.id&&(
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold">Edit product specifications</p><p className="mt-1 text-[9px] text-muted">Material selection recalculates every active size using the configured material rates. Other values appear in the customer-facing Specs tab.</p></div>
            <button type="button" onClick={()=>setEditingProduct(null)} className="rounded-lg border border-border px-2.5 py-1.5 text-[9px]">Cancel</button>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"><input type="checkbox" checked={Boolean(editForm.ordersEnabled)} onChange={e=>setEditForm({...editForm,ordersEnabled:e.target.checked})}/> Accept orders for this product</label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select value={parentCategoryId} onChange={(e)=>{setParentCategoryId(e.target.value);const selected=categories.find((category)=>category.id===e.target.value);setEditForm({...editForm,categoryId:selected?.id||""});}} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
              <option value="">No main category</option>
              {categories.filter((category)=>!category.parentId).map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={String(editForm.categoryId||"")} disabled={!parentCategoryId||!categories.some((category)=>category.parentId===parentCategoryId)} onChange={(e)=>setEditForm({...editForm,categoryId:e.target.value||parentCategoryId})} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
              <option value={parentCategoryId}>Use main category</option>
              {categories.filter((category)=>category.parentId===parentCategoryId).map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[10px] font-medium text-muted" htmlFor={"product-description-"+p.id}>Product description</label>
            <textarea id={"product-description-"+p.id} value={String(editForm.description||"")} onChange={(e)=>setEditForm({...editForm,description:e.target.value})} placeholder="Write or update the customer-facing product description…" rows={5} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs leading-5"/>
            <p className="mt-1 text-[9px] text-muted">You can edit this description any time. Changes are saved when you click Save product.</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[9px] uppercase tracking-wide text-muted"><span>Material · drives all size prices</span><select value={String(editForm.material||"")} onChange={e=>setEditForm({...editForm,material:e.target.value})} className="h-9 rounded-lg border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"><option value="">Select configured material</option>{materials.map(material=><option key={material} value={material}>{material}</option>)}</select></label>
            <input value={String(editForm.scale||"")} onChange={e=>setEditForm({...editForm,scale:e.target.value})} placeholder="Scale" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
            <input value={String(editForm.dimensions||"")} onChange={e=>setEditForm({...editForm,dimensions:e.target.value})} placeholder="Dimensions" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
            <input value={String(editForm.height||"")} onChange={e=>setEditForm({...editForm,height:e.target.value})} placeholder="Height" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
            <input value={String(editForm.base||"")} onChange={e=>setEditForm({...editForm,base:e.target.value})} placeholder="Base" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
            <input value={String(editForm.packaging||"")} onChange={e=>setEditForm({...editForm,packaging:e.target.value})} placeholder="Packaging" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
            <input value={String(editForm.weight||"")} onChange={e=>setEditForm({...editForm,weight:e.target.value})} placeholder="Weight" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
          </div>
          <button type="button" onClick={()=>void saveProductEdit(p.id)} disabled={saving} className="mt-3 rounded-lg bg-foreground px-3 py-2 text-[10px] font-semibold text-background">{saving?"Saving…":"Save specifications"}</button>
        </div>
      )}
    </article>;}
