import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ user:null });
  try {
    const response=await fetch(getBackendApiUrl("auth/admin/session"),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    if(!response.ok){const r=NextResponse.json({user:null}); r.cookies.delete(ADMIN_COOKIE); return r;}
    const data=await response.json().catch(()=>null) as {id?:string;name?:string|null;email?:string;role?:string};
    if(data?.role!=="ADMIN" || !data.id || !data.email){const r=NextResponse.json({user:null}); r.cookies.delete(ADMIN_COOKIE); return r;}
    return NextResponse.json({user:data});
  }catch{return NextResponse.json({user:null},{status:503});}
}