import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!token) return NextResponse.json({error:"Authentication is required."},{status:401});
  const {id}=await context.params;
  try{
    const response=await fetch(getBackendApiUrl("shipping/rules/"+encodeURIComponent(id)),{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:await request.text(),cache:"no-store"});
    const data=await response.json().catch(()=>null);
    return NextResponse.json(data??{error:"Unable to update shipping rule."},{status:response.status});
  }catch{return NextResponse.json({error:"Shipping service is unavailable."},{status:503});}
}