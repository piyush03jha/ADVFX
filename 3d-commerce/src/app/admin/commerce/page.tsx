"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconRefresh } from "@tabler/icons-react";

type Promotion = { id:string; name:string; code?:string|null; type:string; value:number; usageLimit?:number|null; usageCount:number; isActive:boolean };
type TaxRule = { id:string; name:string; countryCode:string; stateCode?:string|null; rateBps:number; priority:number; isActive:boolean };
type MaterialRule = {id:string;material:string;sizeKey:string;currency:string;rawMaterialCostMinor:number;pricePerKgMinor:number;wastageRateBps:number;electricityKwhMilli:number;machineHoursMilli:number;isActive:boolean};
type Product = {id:string;name:string;material?:string|null;variants:Array<{id:string;name:string;size?:string|null;weightGrams?:number|null}>};
type SizeRule = {id:string;sizeKey:string;electricityCostMinor:number;machineCostMinor:number;labourCostMinor:number;finishingCostMinor:number;platformCostMinor:number;packagingCostMinor:number};
type ProductCostRule = {id:string;productId:string;sizeKey:string;labourCostMinor:number|null;paintingCostMinor:number;finishingCostMinor:number;machineSetupCostMinor:number;packagingCostMinor:number|null;product?:{name:string}};
type ManufacturingRates = {electricityRatePerKwhMinor:number;machineHourlyCostMinor:number;generalOverheadBps:number;profitMarginBps:number;defaultLabourCostMinor:number;standardPackagingCostMinor:number};
type SaleCampaign = {enabled:boolean;priceIncreaseBps:number;discountBps:number;startsAt:string|null;endsAt:string|null};

const money = (minor:number|null|undefined) => minor == null ? "Use global default" : "₹" + (minor/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const toMinor = (value:string) => value.trim()==="" ? null : Math.round(Number(value)*100);

export default function AdminCommerceRulesPage() {
  const [promotions,setPromotions]=useState<Promotion[]>([]);
  const [taxRules,setTaxRules]=useState<TaxRule[]>([]);
  const [materialRules,setMaterialRules]=useState<MaterialRule[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [productCostRules,setProductCostRules]=useState<ProductCostRule[]>([]);
  const [sizeRules,setSizeRules]=useState<SizeRule[]>([]);
  const [sizeForm,setSizeForm]=useState({sizeKey:"small",electricity:"",machine:"",labour:"",finishing:"",platform:"",packaging:""});
  const [rates,setRates]=useState<ManufacturingRates>({electricityRatePerKwhMinor:0,machineHourlyCostMinor:0,generalOverheadBps:0,profitMarginBps:0,defaultLabourCostMinor:0,standardPackagingCostMinor:0});
  const [saleCampaign,setSaleCampaign]=useState<SaleCampaign>({enabled:false,priceIncreaseBps:2000,discountBps:2000,startsAt:null,endsAt:null});
  const [saleForm,setSaleForm]=useState({priceIncreasePercent:"20",discountPercent:"20",startsAt:"",endsAt:""});
  const [materialRule,setMaterialRule]=useState({material:"",sizeKey:"all",pricePerKg:"",rawMaterialCost:"",wastagePercent:"",electricityKwh:"",machineHours:""});
  const [productCost,setProductCost]=useState({productId:"",sizeKey:"small",labour:"",painting:"0",finishing:"0",machineSetup:"0",packaging:""});
  const [globalForm,setGlobalForm]=useState({electricityRatePerKwh:"0",machineHourlyCost:"0",generalOverheadPercent:"0",profitMarginPercent:"0",defaultLabourCost:"0",standardPackagingCost:"0"});
  const [promo,setPromo]=useState({name:"",code:"",type:"PERCENTAGE",value:"",minSubtotalMinor:"",maxDiscountMinor:"",usageLimit:""});
  const [tax,setTax]=useState({name:"",countryCode:"IN",stateCode:"",rate:"",priority:"0",applyToShipping:false});
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const [p,t,m,c,pc,g,sc,sizes]=await Promise.all([
        fetch("/api/admin/promotions",{cache:"no-store"}),
        fetch("/api/admin/tax-rules",{cache:"no-store"}),
        fetch("/api/admin/material-pricing",{cache:"no-store"}),
        fetch("/api/admin/catalog",{cache:"no-store"}),
        fetch("/api/admin/product-costs",{cache:"no-store"}),
        fetch("/api/admin/manufacturing-rates",{cache:"no-store"}),
        fetch("/api/admin/sale-campaign",{cache:"no-store"}),
        fetch("/api/admin/size-manufacturing-rules",{cache:"no-store"}),
      ]);
      if(!p.ok||!t.ok||!m.ok||!c.ok||!pc.ok||!g.ok||!sc.ok||!sizes.ok) throw new Error();
      const [promos,taxes,materials,catalog,costs,global,sale,sizeRows]=await Promise.all([p.json(),t.json(),m.json(),c.json(),pc.json(),g.json(),sc.json(),sizes.json()]);
      setPromotions(promos);setTaxRules(taxes);setMaterialRules(materials);setProducts(catalog.products||[]);setProductCostRules(costs);setSizeRules(sizeRows);
      setRates(global);
      setSaleCampaign(sale);
      setSaleForm({
        priceIncreasePercent:(sale.priceIncreaseBps/100).toString(),
        discountPercent:(sale.discountBps/100).toString(),
        startsAt:sale.startsAt ? new Date(new Date(sale.startsAt).getTime()-new Date(sale.startsAt).getTimezoneOffset()*60000).toISOString().slice(0,16) : "",
        endsAt:sale.endsAt ? new Date(new Date(sale.endsAt).getTime()-new Date(sale.endsAt).getTimezoneOffset()*60000).toISOString().slice(0,16) : "",
      });
      setGlobalForm({
        electricityRatePerKwh:(global.electricityRatePerKwhMinor/100).toString(),
        machineHourlyCost:(global.machineHourlyCostMinor/100).toString(),
        generalOverheadPercent:(global.generalOverheadBps/100).toString(),
        profitMarginPercent:(global.profitMarginBps/100).toString(),
        defaultLabourCost:(global.defaultLabourCostMinor/100).toString(),
        standardPackagingCost:(global.standardPackagingCostMinor/100).toString(),
      });
      setMessage("");
    }catch{setMessage("Unable to load commerce and manufacturing pricing settings.");}
    finally{setLoading(false);}
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
    setPromo({name:"",code:"",type:"PERCENTAGE",value:"",minSubtotalMinor:"",maxDiscountMinor:"",usageLimit:""});await load();
  }

  async function createTax(){
    const response=await fetch("/api/admin/tax-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:tax.name,countryCode:tax.countryCode,stateCode:tax.stateCode||null,
      rateBps:Math.round(Number(tax.rate)*100),priority:Number(tax.priority||0),applyToShipping:tax.applyToShipping,
    })});
    if(!response.ok){setMessage("Unable to save tax rule.");return;}
    setTax({name:"",countryCode:"IN",stateCode:"",rate:"",priority:"0",applyToShipping:false});await load();
  }

  async function saveMaterialRule(){
    const raw=toMinor(materialRule.rawMaterialCost)??0;
    const pricePerKg=toMinor(materialRule.pricePerKg);
    const waste=Number(materialRule.wastagePercent||0);
    const kwh=Number(materialRule.electricityKwh||0);
    const hours=Number(materialRule.machineHours||0);
    if(!materialRule.material.trim()||pricePerKg===null||pricePerKg<=0||raw<0||![waste,kwh,hours].every(v=>Number.isFinite(v)&&v>=0)){
      setMessage("Enter valid non-negative material and consumption values.");return;
    }
    setSaving(true);
    try{
      const response=await fetch("/api/admin/material-pricing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        material:materialRule.material.trim(),sizeKey:materialRule.sizeKey,currency:"INR",
        rawMaterialCostMinor:raw,pricePerKgMinor:pricePerKg,wastageRateBps:Math.round(waste*100),
        electricityKwhMilli:Math.round(kwh*1000),machineHoursMilli:Math.round(hours*1000),
      })});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.message||"Unable to save material pricing.");return;}
      setMaterialRule({...materialRule,pricePerKg:"",rawMaterialCost:"",wastagePercent:"",electricityKwh:"",machineHours:""});
      await load();
    }finally{setSaving(false);}
  }

  async function saveSizeRule(){
    const values=[sizeForm.electricity,sizeForm.machine,sizeForm.labour,sizeForm.finishing,sizeForm.platform,sizeForm.packaging].map(toMinor);
    if(values.some(value=>value===null||value<0)){setMessage("Enter a non-negative INR amount for every size cost.");return;}
    setSaving(true);
    try{
      const [electricityCostMinor,machineCostMinor,labourCostMinor,finishingCostMinor,platformCostMinor,packagingCostMinor]=values as number[];
      const response=await fetch("/api/admin/size-manufacturing-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sizeKey:sizeForm.sizeKey,electricityCostMinor,machineCostMinor,labourCostMinor,finishingCostMinor,platformCostMinor,packagingCostMinor})});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.message||"Unable to save size manufacturing costs.");return;}
      setMessage("Size manufacturing costs saved. Variant prices recalculated.");
      await load();
    }finally{setSaving(false);}
  }

  async function saveSaleCampaign(){
    const increase=Number(saleForm.priceIncreasePercent);
    const discount=Number(saleForm.discountPercent);
    if(!Number.isFinite(increase)||!Number.isFinite(discount)||increase<0||increase>100||discount<0||discount>100){
      setMessage("Sale price increase and discount must each be between 0% and 100%.");return;
    }
    if(saleForm.startsAt&&saleForm.endsAt&&new Date(saleForm.endsAt)<=new Date(saleForm.startsAt)){
      setMessage("Sale end date must be after its start date.");return;
    }
    setSaving(true);
    try{
      const response=await fetch("/api/admin/sale-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        enabled:saleCampaign.enabled,
        priceIncreaseBps:Math.round(increase*100),
        discountBps:Math.round(discount*100),
        startsAt:saleForm.startsAt?new Date(saleForm.startsAt).toISOString():null,
        endsAt:saleForm.endsAt?new Date(saleForm.endsAt).toISOString():null,
      })});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.message||"Unable to save sale campaign.");return;}
      setSaleCampaign(data);await load();setMessage("Sale campaign settings saved.");
    }finally{setSaving(false);}
  }

  async function saveGlobalRates(){
    setSaving(true);
    try{
      const payload={
        electricityRatePerKwhMinor:toMinor(globalForm.electricityRatePerKwh)??0,
        machineHourlyCostMinor:toMinor(globalForm.machineHourlyCost)??0,
        generalOverheadBps:Math.round(Number(globalForm.generalOverheadPercent||0)*100),
        profitMarginBps:Math.round(Number(globalForm.profitMarginPercent||0)*100),
        defaultLabourCostMinor:toMinor(globalForm.defaultLabourCost)??0,
        standardPackagingCostMinor:toMinor(globalForm.standardPackagingCost)??0,
      };
      const response=await fetch("/api/admin/manufacturing-rates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.message||"Unable to save global manufacturing rates.");return;}
      setRates(data);await load();
    }finally{setSaving(false);}
  }

  async function saveProductCost(){
    if(!productCost.productId){setMessage("Select a product before saving its cost rules.");return;}
    setSaving(true);
    try{
      const response=await fetch("/api/admin/product-costs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        productId:productCost.productId,sizeKey:productCost.sizeKey,
        labourCostMinor:toMinor(productCost.labour),
        paintingCostMinor:toMinor(productCost.painting)??0,
        finishingCostMinor:toMinor(productCost.finishing)??0,
        machineSetupCostMinor:toMinor(productCost.machineSetup)??0,
        packagingCostMinor:toMinor(productCost.packaging),
      })});
      const data=await response.json().catch(()=>null);
      if(!response.ok){setMessage(data?.message||"Unable to save product cost rule.");return;}
      setProductCostRules(current=>[...current.filter(rule=>!(rule.productId===data.productId&&rule.sizeKey===data.sizeKey)),data]);
      setMessage("Product cost rule saved and applicable variant prices recalculated.");
      await load();
    }finally{setSaving(false);}
  }

  async function toggle(kind:string,id:string,isActive:boolean){
    await fetch("/api/admin/"+kind+"/"+encodeURIComponent(id)+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!isActive})});await load();
  }

  const inputClass="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
  const selectedProduct=products.find(product=>product.id===productCost.productId);

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] uppercase tracking-[0.2em] text-primary">Commerce</p><h1 className="mt-2 font-serif text-4xl">Promotions, tax & pricing</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-muted">Configure manufacturing costs in one place. Product variant selling prices are recalculated from material, product and global rules.</p></div>
      <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted"><IconRefresh size={14}/> Refresh</button>
    </div>
    {message&&<p className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">{message}</p>}
    {loading?<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface"/>:<>
      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Layer 01 · Material defaults</p><h2 className="mt-1 text-xl font-semibold">Material-based pricing</h2><p className="mt-2 text-sm leading-6 text-muted">Set the material rate per kilogram and wastage percentage. Variant weight in grams determines the material cost.</p></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input value={materialRule.material} onChange={e=>setMaterialRule({...materialRule,material:e.target.value})} placeholder="Material (e.g. Resin)" className={inputClass}/>
          <select value={materialRule.sizeKey} onChange={e=>setMaterialRule({...materialRule,sizeKey:e.target.value})} className={inputClass}><option value="all">All sizes</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
          <input value={materialRule.pricePerKg} onChange={e=>setMaterialRule({...materialRule,pricePerKg:e.target.value})} type="number" min="0.01" step="0.01" placeholder="Material rate (₹ per kg)" className={inputClass}/>
          <input value={materialRule.wastagePercent} onChange={e=>setMaterialRule({...materialRule,wastagePercent:e.target.value})} type="number" min="0" step="0.01" placeholder="Wastage (%)" className={inputClass}/>
 
        </div>
        <button disabled={saving} type="button" onClick={()=>void saveMaterialRule()} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">Save material rule</button>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{materialRules.map(rule=><div key={rule.id} className="rounded-2xl border border-border p-4"><div className="flex justify-between gap-2"><p className="text-xs font-medium">{rule.material} · {rule.sizeKey}</p><span className="text-[10px] text-muted">{rule.isActive?"Active":"Inactive"}</span></div><p className="mt-1 text-[10px] text-muted">Rate {money(rule.pricePerKgMinor)} / kg · Waste {(rule.wastageRateBps/100).toFixed(2)}%</p></div>)}</div>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Layer 02 · Fixed size costs</p>
        <h2 className="mt-1 text-xl font-semibold">Small, Medium & Large manufacturing costs</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Set fixed INR costs for each size. These are added to weight-based material cost before overhead and profit margin.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select value={sizeForm.sizeKey} onChange={e=>setSizeForm({...sizeForm,sizeKey:e.target.value})} className={inputClass}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
          <input value={sizeForm.electricity} onChange={e=>setSizeForm({...sizeForm,electricity:e.target.value})} type="number" min="0" step="0.01" placeholder="Electricity cost · ₹" className={inputClass}/>
          <input value={sizeForm.machine} onChange={e=>setSizeForm({...sizeForm,machine:e.target.value})} type="number" min="0" step="0.01" placeholder="Machine cost · ₹" className={inputClass}/>
          <input value={sizeForm.labour} onChange={e=>setSizeForm({...sizeForm,labour:e.target.value})} type="number" min="0" step="0.01" placeholder="Labour cost · ₹" className={inputClass}/>
          <input value={sizeForm.finishing} onChange={e=>setSizeForm({...sizeForm,finishing:e.target.value})} type="number" min="0" step="0.01" placeholder="Finishing / painting · ₹" className={inputClass}/>
          <input value={sizeForm.platform} onChange={e=>setSizeForm({...sizeForm,platform:e.target.value})} type="number" min="0" step="0.01" placeholder="Platform cost · ₹" className={inputClass}/>
          <input value={sizeForm.packaging} onChange={e=>setSizeForm({...sizeForm,packaging:e.target.value})} type="number" min="0" step="0.01" placeholder="Packaging cost · ₹" className={inputClass}/>
        </div>
        <button disabled={saving} type="button" onClick={()=>void saveSizeRule()} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">Save size costs</button>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{sizeRules.map(rule=><div key={rule.id} className="rounded-2xl border border-border p-4"><p className="text-xs font-semibold capitalize">{rule.sizeKey}</p><p className="mt-2 text-[10px] text-muted">Electricity {money(rule.electricityCostMinor)} · Machine {money(rule.machineCostMinor)}</p><p className="mt-1 text-[10px] text-muted">Labour {money(rule.labourCostMinor)} · Finishing {money(rule.finishingCostMinor)}</p><p className="mt-1 text-[10px] text-muted">Platform {money(rule.platformCostMinor)} · Packaging {money(rule.packagingCostMinor)}</p></div>)}</div>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Layer 03 · Product overrides</p><h2 className="mt-1 text-xl font-semibold">Product-based pricing</h2><p className="mt-2 text-sm leading-6 text-muted">Set product-specific labour, painting, finishing, machine setup and packaging costs for each size. Leave labour or packaging blank to use the global default.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={productCost.productId} onChange={e=>setProductCost({...productCost,productId:e.target.value})} className={inputClass}><option value="">Select product</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}{product.material?" · "+product.material:""}</option>)}</select>
          <select value={productCost.sizeKey} onChange={e=>setProductCost({...productCost,sizeKey:e.target.value})} className={inputClass}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
          <input value={productCost.labour} onChange={e=>setProductCost({...productCost,labour:e.target.value})} type="number" min="0" step="0.01" placeholder="Labour override (₹, blank = default)" className={inputClass}/>
          <input value={productCost.painting} onChange={e=>setProductCost({...productCost,painting:e.target.value})} type="number" min="0" step="0.01" placeholder="Painting cost (₹)" className={inputClass}/>
          <input value={productCost.finishing} onChange={e=>setProductCost({...productCost,finishing:e.target.value})} type="number" min="0" step="0.01" placeholder="Finishing cost (₹)" className={inputClass}/>
          <input value={productCost.machineSetup} onChange={e=>setProductCost({...productCost,machineSetup:e.target.value})} type="number" min="0" step="0.01" placeholder="Machine setup cost (₹)" className={inputClass}/>
          <input value={productCost.packaging} onChange={e=>setProductCost({...productCost,packaging:e.target.value})} type="number" min="0" step="0.01" placeholder="Packaging override (₹, blank = default)" className={inputClass}/>
        </div>
        <button disabled={saving} type="button" onClick={()=>void saveProductCost()} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">Save product costs</button>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{productCostRules.map(rule=><div key={rule.id} className="rounded-2xl border border-border p-4"><p className="text-xs font-medium">{rule.product?.name??products.find(p=>p.id===rule.productId)?.name??"Product"} · {rule.sizeKey}</p><p className="mt-1 text-[10px] text-muted">Labour {money(rule.labourCostMinor)} · Painting {money(rule.paintingCostMinor)} · Finishing {money(rule.finishingCostMinor)}</p><p className="mt-1 text-[10px] text-muted">Setup {money(rule.machineSetupCostMinor)} · Packaging {money(rule.packagingCostMinor)}</p></div>)}</div>
        {selectedProduct&&<p className="mt-3 text-[10px] text-muted">Selected: {selectedProduct.name} · material {selectedProduct.material??"not set"}</p>}
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Layer 04 · Shared rates</p><h2 className="mt-1 text-xl font-semibold">Global manufacturing pricing</h2><p className="mt-2 text-sm leading-6 text-muted">Overhead and gross profit margin apply globally. Electricity, machine, labour, finishing, platform and packaging use the fixed size costs above; these legacy global rates remain fallbacks where a size-specific cost is not configured.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input value={globalForm.electricityRatePerKwh} onChange={e=>setGlobalForm({...globalForm,electricityRatePerKwh:e.target.value})} type="number" min="0" step="0.01" placeholder="Electricity rate per kWh (₹)" className={inputClass}/>
          <input value={globalForm.machineHourlyCost} onChange={e=>setGlobalForm({...globalForm,machineHourlyCost:e.target.value})} type="number" min="0" step="0.01" placeholder="Machine hourly cost (₹)" className={inputClass}/>
          <input value={globalForm.generalOverheadPercent} onChange={e=>setGlobalForm({...globalForm,generalOverheadPercent:e.target.value})} type="number" min="0" max="100" step="0.01" placeholder="General overhead (%)" className={inputClass}/>
          <input value={globalForm.profitMarginPercent} onChange={e=>setGlobalForm({...globalForm,profitMarginPercent:e.target.value})} type="number" min="0" max="80" step="0.01" placeholder="Target profit margin (%)" className={inputClass}/>
          <input value={globalForm.defaultLabourCost} onChange={e=>setGlobalForm({...globalForm,defaultLabourCost:e.target.value})} type="number" min="0" step="0.01" placeholder="Default labour cost per unit (₹)" className={inputClass}/>
          <input value={globalForm.standardPackagingCost} onChange={e=>setGlobalForm({...globalForm,standardPackagingCost:e.target.value})} type="number" min="0" step="0.01" placeholder="Standard packaging cost (₹)" className={inputClass}/>
        </div>
        <button disabled={saving} type="button" onClick={()=>void saveGlobalRates()} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">Save global rates & recalculate catalog</button>
        <p className="mt-3 text-[11px] leading-5 text-muted">Current global defaults: electricity {money(rates.electricityRatePerKwhMinor)}/kWh · machine {money(rates.machineHourlyCostMinor)}/hour · overhead {(rates.generalOverheadBps/100).toFixed(2)}% · profit margin {(rates.profitMarginBps/100).toFixed(2)}%.</p>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Layer 05 · Storefront promotion</p><h2 className="mt-1 text-xl font-semibold">Sale campaign</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Temporarily increase every active product's list price, then apply a sale discount. Manufacturing prices are never overwritten. Customers can still apply eligible coupon codes on top of the sale.</p></div>
          <label className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs"><input type="checkbox" checked={saleCampaign.enabled} onChange={e=>setSaleCampaign({...saleCampaign,enabled:e.target.checked})}/> Enable sale</label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[10px] text-muted">List price increase (%)
            <input value={saleForm.priceIncreasePercent} onChange={e=>setSaleForm({...saleForm,priceIncreasePercent:e.target.value})} type="number" min="0" max="100" step="0.01" className={inputClass}/>
          </label>
          <label className="text-[10px] text-muted">Sale discount (%)
            <input value={saleForm.discountPercent} onChange={e=>setSaleForm({...saleForm,discountPercent:e.target.value})} type="number" min="0" max="100" step="0.01" className={inputClass}/>
          </label>
          <label className="text-[10px] text-muted">Starts at (optional)
            <input value={saleForm.startsAt} onChange={e=>setSaleForm({...saleForm,startsAt:e.target.value})} type="datetime-local" className={inputClass}/>
          </label>
          <label className="text-[10px] text-muted">Ends at (optional)
            <input value={saleForm.endsAt} onChange={e=>setSaleForm({...saleForm,endsAt:e.target.value})} type="datetime-local" className={inputClass}/>
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-border p-4 text-xs">
          <p className="font-medium">Price preview · ₹1,000 base price</p>
          <p className="mt-1 text-muted">List price: ₹{(1000*(1+Math.max(0,Number(saleForm.priceIncreasePercent)||0)/100)).toLocaleString("en-IN",{maximumFractionDigits:2})} · After sale discount: ₹{(1000*(1+Math.max(0,Number(saleForm.priceIncreasePercent)||0)/100)*(1-Math.min(100,Math.max(0,Number(saleForm.discountPercent)||0))/100)).toLocaleString("en-IN",{maximumFractionDigits:2})}</p>
          <p className="mt-1 text-[10px] text-muted">The campaign runs only when enabled and inside its optional date window. A coupon is then applied to the discounted sale subtotal.</p>
        </div>
        <button disabled={saving} type="button" onClick={()=>void saveSaleCampaign()} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">Save sale campaign</button>
        <p className="mt-3 text-[11px] leading-5 text-muted">Current status: {saleCampaign.enabled?"Enabled (date window still applies)":"Disabled"} · {saleCampaign.priceIncreaseBps/100}% list increase · {saleCampaign.discountBps/100}% discount.</p>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
          <h2 className="text-xl font-semibold">Promotions</h2>
          <div className="mt-5 grid gap-4">
            {["name","code","value","minSubtotalMinor","maxDiscountMinor","usageLimit"].map(field=><input key={field} value={promo[field as keyof typeof promo]} onChange={e=>setPromo({...promo,[field]:e.target.value})} placeholder={field} className={inputClass}/>)}
            <select value={promo.type} onChange={e=>setPromo({...promo,type:e.target.value})} className={inputClass}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select>
            <button type="button" onClick={()=>void createPromotion()} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-white"><IconPlus size={14}/> Add promotion</button>
          </div>
          <div className="mt-6 space-y-3">{promotions.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"><div><p className="text-xs font-medium">{p.name}{p.code?" · "+p.code:""}</p><p className="mt-1 text-[10px] text-muted">{p.type} · {p.value} · used {p.usageCount}{p.usageLimit!=null?"/"+p.usageLimit:""}</p></div><button type="button" onClick={()=>void toggle("promotions",p.id,p.isActive)} className="text-[10px] text-muted">{p.isActive?"Disable":"Enable"}</button></div>)}</div>
        </section>
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
          <h2 className="text-xl font-semibold">Legacy country tax rules</h2><p className="mt-2 text-sm leading-6 text-muted">Product GST is configured on each category in Admin → Categories. These legacy rules do not change product prices.</p>
          <div className="mt-5 grid gap-4">
            {["name","countryCode","stateCode","rate","priority"].map(field=><input key={field} value={tax[field as keyof typeof tax] as string} onChange={e=>setTax({...tax,[field]:e.target.value})} placeholder={field} className={inputClass}/>)}
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={tax.applyToShipping} onChange={e=>setTax({...tax,applyToShipping:e.target.checked})}/> Apply tax to shipping</label>
            <button type="button" onClick={()=>void createTax()} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-white"><IconPlus size={14}/> Add tax rule</button>
          </div>
          <div className="mt-6 space-y-3">{taxRules.map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"><div><p className="text-xs font-medium">{t.name}</p><p className="mt-1 text-[10px] text-muted">{t.countryCode}{t.stateCode?" / "+t.stateCode:""} · {(t.rateBps/100).toFixed(2)}% · priority {t.priority}</p></div><button type="button" onClick={()=>void toggle("tax-rules",t.id,t.isActive)} className="text-[10px] text-muted">{t.isActive?"Disable":"Enable"}</button></div>)}</div>
        </section>
      </div>
    </>}
  </main>;
}
