import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!token) return NextResponse.json({error:"Authentication is required."},{status:401});
  const {id}=await context.params;
  try{
    const response=await fetch(getBackendApiUrl("shipping/rules/"+encodeURIComponent(id)+"/deactivate"),{method:"POST",headers:{Authorization:"Bearer "+token},cache:"no-store"});
    const data=await response.json().catch(()=>null);
    return NextResponse.json(data??{error:"Unable to deactivate shipping rule."},{status:response.status});
  }catch{return NextResponse.json({error:"Shipping service is unavailable."},{status:503});}
}