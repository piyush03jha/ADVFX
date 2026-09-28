"use client";
import type { Dispatch, SetStateAction } from "react";
import { IconArchive, IconBox, IconEdit, IconTrash, IconUpload, IconX } from "@tabler/icons-react";

type ProductVariant={id:string;name:string;size?:string|null;sku?:string|null;isActive:boolean;stock?:number;reserved?:number;lowStockAt?:number;trackStock?:boolean;allowBackorder?:boolean;price?:{amountMinor:number;compareAtMinor?:number|null;isActive:boolean}|null};
type Product={id:string;name:string;slug:string;status:string;isFeatured:boolean;isTrending:boolean;isBestseller:boolean;category?:{id:string;name:string}|null;prices:any[];variants?:ProductVariant[];material?:string|null;scale?:string|null;dimensions?:string|null;height?:string|null;base?:string|null;packaging?:string|null;weight?:string|null;inventory?:{stock:number;reserved:number;lowStockAt:number}|null;media?:Array<{id:string;type:string;url:string;altText?:string|null;isPrimary:boolean;sortOrder:number}>};
type ProductFile={id:string;originalName:string;storageUrl:string;format:string;fileType:string;mimeType:string;fileSize:string|number;processingStatus:string};

type Props={product:Product;saving:boolean;assetProductId:string|null;assetFiles:ProductFile[];assetLoading:boolean;assetBusy:boolean;assetMessage:string;uploadProgress:Record<string,number>;editForm:Record<string,string|boolean>;updatePrice:(id:string,value:string)=>Promise<void>;updateProduct:(id:string,patch:Record<string,unknown>)=>Promise<void>;updateVariant:(productId:string,variantId:string,payload:Record<string,unknown>)=>Promise<void>;deleteProduct:(id:string,name:string)=>Promise<void>;startProductEdit:(p:Product)=>void;openAssets:(id:string)=>Promise<void>;uploadImages:(id:string,files:FileList|null)=>Promise<void>;uploadGlb:(id:string,file:File|null)=>Promise<void>;removeMedia:(id:string,mediaId:string)=>Promise<void>;removeFile:(id:string,fileId:string)=>Promise<void>;setEditingProduct:(id:string|null)=>void;setEditForm:Dispatch<SetStateAction<Record<string,string|boolean>>>;saveProductEdit:(id:string)=>Promise<void>};

export default function AdminProductCard({product:p,...props}:Props){const {saving,assetProductId,assetFiles,assetLoading,assetBusy,assetMessage,uploadProgress,editForm,updatePrice,updateProduct,updateVariant,deleteProduct,startProductEdit,openAssets,uploadImages,uploadGlb,removeMedia,removeFile,setEditingProduct,setEditForm,saveProductEdit}=props;return <article key={p.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">{p.name}</p><p className="mt-1 text-[10px] text-muted">{p.slug} · {p.category?.name||"Uncategorized"}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] text-primary">{p.status}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Price</p><div className="mt-1 flex items-center gap-2"><span className="text-xs text-muted">₹</span><input defaultValue={((p.prices?.[0]?.amountMinor||0)/100).toString()} type="number" min="0" step="1" className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-xs"/><button onClick={e=>{const input=(e.currentTarget.previousElementSibling as HTMLInputElement);void updatePrice(p.id,input.value)}} disabled={saving} className="rounded-lg border border-border px-2 py-1.5 text-[9px]">Save</button></div></div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Stock</p><p className="mt-1 text-sm">{p.inventory?Math.max(0,p.inventory.stock-p.inventory.reserved):0}</p></div>
        <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Hero</p><button onClick={()=>void updateProduct(p.id,{isFeatured:!p.isFeatured})} disabled={saving} className="mt-1 rounded-lg border border-border px-2.5 py-1.5 text-[9px]">{p.isFeatured?"Remove from hero":"Feature in hero"}</button></div>
        <div className="flex items-end justify-end gap-2"><button onClick={()=>startProductEdit(p)} disabled={saving} title="Edit product" className="rounded-lg border border-border p-2 text-muted"><IconEdit size={14}/></button><button onClick={()=>void updateProduct(p.id,{status:"ARCHIVED"})} disabled={saving||p.status==="ARCHIVED"} title="Archive product" className="rounded-lg border border-border p-2 text-muted"><IconArchive size={14}/></button><button onClick={()=>void deleteProduct(p.id,p.name)} disabled={saving} title="Permanently delete product" className="rounded-lg border border-red-400/20 p-2 text-red-300"><IconTrash size={14}/></button></div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Size-specific pricing</p><p className="mt-1 text-[10px] text-muted">Set the exact selling price for Small, Medium and Large. The selected price is used on the product page and in the cart.</p></div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {(p.variants||[]).map(v=><form key={v.id} onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);void updateVariant(p.id,v.id,{name:String(fd.get("name")||""),size:String(fd.get("size")||""),stock:Number(fd.get("stock")||0),price:Number(fd.get("price")||0),compareAtPrice:String(fd.get("compareAtPrice")||"")===""?null:Number(fd.get("compareAtPrice"))})}} className="rounded-xl border border-border bg-background/50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input name="name" defaultValue={v.name} placeholder="Name" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <input name="size" defaultValue={v.size||""} placeholder="Size e.g. 15 cm" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <input name="price" defaultValue={((v.price?.amountMinor||0)/100).toString()} type="number" min="0" step="1" placeholder="Price ₹" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <input name="stock" defaultValue={String(v.stock ?? 0)} type="number" min="0" step="1" placeholder="Stock units" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
              <input name="compareAtPrice" defaultValue={v.price?.compareAtMinor!=null?((v.price.compareAtMinor)/100).toString():""} type="number" min="0" step="1" placeholder="MRP ₹ (optional)" className="h-8 rounded-lg border border-border bg-background px-2 text-[10px]"/>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[9px] text-muted">{v.isActive?"Active":"Inactive"} · {Math.max(0,(v.stock||0)-(v.reserved||0))} available</span>
              <button disabled={saving} className="rounded-lg bg-foreground px-2.5 py-1.5 text-[9px] font-semibold text-background">Save size</button>
            </div>
          </form>)}
        </div>
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
            <div><p className="text-xs font-semibold">Edit product specifications</p><p className="mt-1 text-[9px] text-muted">These values are shown in the customer-facing Specs tab.</p></div>
            <button type="button" onClick={()=>setEditingProduct(null)} className="rounded-lg border border-border px-2.5 py-1.5 text-[9px]">Cancel</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={String(editForm.material||"")} onChange={e=>setEditForm({...editForm,material:e.target.value})} placeholder="Material" className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/>
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
