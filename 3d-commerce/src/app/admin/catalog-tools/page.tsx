"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { AdminPage,AdminCard,AdminButton,AdminTable,AdminTableHeader } from '@/components/admin/AdminKit';

type Product={id:string;name:string;slug:string;status:string;isFeatured:boolean;isTrending:boolean;category?:{name:string}|null;prices?:Array<{amountMinor:number}>};
type ImportedProduct={id:string;name:string;slug:string;status:string;action:'created'|'updated';restored:boolean};
export default function CatalogTools(){
 const [products,setProducts]=useState<Product[]>([]),[selected,setSelected]=useState<string[]>([]),[action,setAction]=useState(''),[message,setMessage]=useState(''),[csv,setCsv]=useState(''),[loading,setLoading]=useState(true);
 const [restoreArchived,setRestoreArchived]=useState(true);
 const [importing,setImporting]=useState(false);
 const [imported,setImported]=useState<ImportedProduct[]>([]);
 const [importErrors,setImportErrors]=useState<string[]>([]);
 const [importNotices,setImportNotices]=useState<string[]>([]);
 const [onlyImported,setOnlyImported]=useState(false);
 const [search,setSearch]=useState('');
 const [categoryFilter,setCategoryFilter]=useState('');
 const [statusFilter,setStatusFilter]=useState('all');
 const [loadError,setLoadError]=useState('');
 const visibleProducts=products.filter(p=>(!onlyImported||imported.some(row=>row.id===p.id))&&(statusFilter==='all'||(statusFilter==='current'?p.status!=='ARCHIVED':p.status===statusFilter))&&(!categoryFilter||p.category?.name===categoryFilter)&&[p.name,p.slug,p.category?.name??''].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 const allVisibleSelected=visibleProducts.length>0&&visibleProducts.every(p=>selected.includes(p.id));
 async function load(){
  setLoading(true);setLoadError('');
  try{
   const r=await fetch('/api/admin/catalog?includeArchived=true',{cache:'no-store'});
   if(!r.ok)throw new Error('Unable to refresh the catalog. Use Refresh to retry.');
   const data=await r.json();
   setProducts(Array.isArray(data.products)?data.products:[]);
   return true;
  }catch(e){setLoadError(e instanceof Error?e.message:'Unable to refresh catalog.');return false}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
 async function bulk(){if(!selected.length||!action)return;setMessage('');const r=await fetch('/api/admin/products/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selected,action})});const d=await r.json().catch(()=>null);setMessage(r.ok?'Updated '+(d?.updated??0)+' products.':(d?.message||'Bulk action failed.'));if(r.ok){setSelected([]);await load()}}
 function exportCsv(){const headers=['name','slug','status','isFeatured','isTrending','category','price'];const rows=products.map(p=>[p.name,p.slug,p.status,String(p.isFeatured),String(p.isTrending),p.category?.name??'',String((p.prices?.[0]?.amountMinor??0)/100)]);const esc=(v:string)=>'"'+v.replaceAll('"','""')+'"';const text=[headers,...rows].map(row=>row.map(esc).join(',')).join('\n');const blob=new Blob([text],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='products.csv';a.click();URL.revokeObjectURL(url)}
 async function importCsv(){
  if(!csv.trim()||importing)return;
  setImporting(true);setMessage('');setImported([]);setImportErrors([]);setImportNotices([]);setOnlyImported(false);
  try{
   const r=await fetch('/api/admin/products/import-csv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csv,restoreArchived})});
   const d=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(d?.message||d?.error||'Import failed.');
   const rows:ImportedProduct[]=Array.isArray(d?.products)?d.products:[];
   const errs:string[]=Array.isArray(d?.errors)?d.errors:[];
   const notices:string[]=Array.isArray(d?.notices)?d.notices:[];
   setImported(rows);setImportErrors(errs);setImportNotices(notices);
   setMessage('Imported: '+(d?.created??0)+' created, '+(d?.updated??0)+' updated, '+rows.filter(p=>p.restored).length+' restored to draft, '+errs.length+' errors.');
   if(!errs.length)setCsv('');
   setSelected([]);setSearch('');setCategoryFilter('');setStatusFilter('all');setOnlyImported(rows.length>0);
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:'Import failed.')}finally{setImporting(false)}
 }
 async function duplicate(id:string){const r=await fetch('/api/admin/products/duplicate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:id})});const d=await r.json().catch(()=>null);setMessage(r.ok?'Draft duplicate created: '+d.name:(d?.message||'Duplicate failed.'));if(r.ok)await load()}
 return <AdminPage title="Catalog operations" eyebrow="Catalog" description="Bulk product actions, safe duplication, and CSV import/export." actions={<div className="flex gap-2"><AdminButton onClick={exportCsv}>Export CSV</AdminButton><AdminButton onClick={()=>document.getElementById('csv-file')?.click()}>Import CSV</AdminButton><input id="csv-file" type="file" accept=".csv,text/csv" className="hidden" onChange={async e=>{const f=e.target.files?.[0];if(f){setCsv(await f.text());setMessage('');setOnlyImported(false)}e.target.value=''}}/></div>}>
 <AdminCard className="mt-7">
  <div className="flex flex-wrap items-center gap-2"><select value={action} onChange={e=>setAction(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="">Bulk action…</option><option value="ACTIVATE">Activate</option><option value="ARCHIVE">Archive</option><option value="FEATURE">Feature</option><option value="UNFEATURE">Unfeature</option><option value="TRENDING">Mark trending</option><option value="UNTRENDING">Remove trending</option></select><AdminButton disabled={!selected.length||!action||importing} onClick={()=>void bulk()}>Apply to {selected.length||0}</AdminButton>{message&&<span role="status" className="text-xs text-foreground">{message}</span>}</div>
  <div className="mt-4">
   <textarea value={csv} disabled={importing} onChange={e=>setCsv(e.target.value)} placeholder="CSV import preview / paste CSV here" className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-xs"/>
   {csv&&<div className="mt-3 flex flex-col items-start gap-3"><label className="flex items-start gap-2 text-xs text-foreground"><input type="checkbox" checked={restoreArchived} disabled={importing} onChange={e=>setRestoreArchived(e.target.checked)}/><span>Restore matching archived products as drafts when Status is blank.<span className="mt-1 block text-muted">Existing active/draft statuses remain unchanged. An explicit CSV Status takes precedence. Review prices and images before activation.</span></span></label><AdminButton disabled={importing} onClick={()=>void importCsv()}>{importing?'Processing CSV…':'Process CSV'}</AdminButton></div>}
  </div>
  {importErrors.length>0&&<div className="mt-3 rounded-xl border border-red-500/30 p-3 text-xs"><p className="font-semibold">Import errors</p>{importErrors.map((error,i)=><p key={i} className="mt-1 break-words text-muted">{error}</p>)}</div>}
  {importNotices.length>0&&<div className="mt-3 rounded-xl border border-border p-3 text-xs"><p className="font-semibold">Import notices</p>{importNotices.map((notice,i)=><p key={i} className="mt-1 break-words text-muted">{notice}</p>)}</div>}
 </AdminCard>
 {imported.length>0&&<AdminCard className="mt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Imported products ({imported.length})</h2><p className="mt-1 text-xs text-muted">Status at the time of import. Draft and archived products are not public.</p></div><AdminButton onClick={()=>{setOnlyImported(true);setStatusFilter('all');setSearch('');setCategoryFilter('');setSelected([])}}>Show imported in catalog</AdminButton></div><div className="mt-3 divide-y divide-border">{imported.map((p,i)=><div key={p.id+':'+i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><div><p className="font-medium">{p.name}</p><p className="break-all text-muted">{p.slug}</p></div><span>{p.action} · {p.status}{p.restored?' · restored':''}</span></div>)}</div><p className="mt-3 text-xs text-muted">For prices, photos, and size variants, open <Link href="/admin/products" className="underline">Catalog</Link> and search by product name or slug.</p></AdminCard>}
 <AdminCard className="mt-5">
  <div className="mb-4 flex flex-wrap items-center gap-2"><input value={search} onChange={e=>{setSearch(e.target.value);setSelected([])}} placeholder="Search name, slug or category" className="min-w-48 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"/><select aria-label="Filter by category" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setSelected([])}} className="rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="">All categories</option>{[...new Set(products.map(p=>p.category?.name).filter((name):name is string=>Boolean(name)))].sort().map(name=><option key={name}>{name}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setSelected([])}} className="rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="all">All statuses</option><option value="current">Active and draft</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>{onlyImported&&<AdminButton onClick={()=>{setOnlyImported(false);setSelected([])}}>Show all products</AdminButton>}<AdminButton disabled={loading} onClick={()=>void load()}>Refresh</AdminButton></div>
  <p className="mb-3 text-xs text-muted">{visibleProducts.length} matching products{onlyImported?' · latest import':''}</p>
  {loadError&&<p role="alert" className="mb-3 text-xs text-red-400">{loadError}</p>}
  <AdminTable><AdminTableHeader><th className="p-3"><input aria-label="Select visible products" type="checkbox" checked={allVisibleSelected} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...visibleProducts.map(p=>p.id)])]:selected.filter(id=>!visibleProducts.some(p=>p.id===id)))}/></th><th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Category</th><th className="p-3">Actions</th></AdminTableHeader><tbody>{loading?<tr><td colSpan={5} className="p-5">Loading…</td></tr>:visibleProducts.length===0?<tr><td colSpan={5} className="p-5 text-muted">No matching products.</td></tr>:visibleProducts.map(p=><tr key={p.id} className="border-b border-border last:border-0"><td className="p-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/></td><td className="p-3"><div>{p.name}</div><div className="text-[10px] text-muted">{p.slug}</div></td><td className="p-3">{p.status}</td><td className="p-3 text-muted">{p.category?.name??'—'}</td><td className="p-3"><AdminButton onClick={()=>void duplicate(p.id)}>Duplicate</AdminButton></td></tr>)}</tbody></AdminTable>
 </AdminCard>
 </AdminPage>}
