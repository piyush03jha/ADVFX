import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET(){
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(!token) return NextResponse.json({error:"Authentication is required."},{status:401});
 try{
  const response=await fetch(getBackendApiUrl("admin/dashboard"),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const data=await response.json().catch(()=>null);
  return NextResponse.json(data??{error:"Unable to load dashboard."},{status:response.status});
 }catch{return NextResponse.json({error:"Admin service is unavailable."},{status:503});}
}