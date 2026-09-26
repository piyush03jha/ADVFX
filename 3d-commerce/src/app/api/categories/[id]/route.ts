import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function proxy(request:Request,context:{params:Promise<{id:string}>},method:"PATCH"|"DELETE"){
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!token)return NextResponse.json({error:"Authentication is required."},{status:401});
  const {id}=await context.params;
  try{
    const response=await fetch(getBackendApiUrl("categories/"+encodeURIComponent(id)),{method,headers:{Authorization:"Bearer "+token,...(method==="PATCH"?{"Content-Type":"application/json"}:{})},body:method==="PATCH"?await request.text():undefined,cache:"no-store"});
    const data=await response.json().catch(()=>null);
    return NextResponse.json(data??{error:"Category operation failed."},{status:response.status});
  }catch{return NextResponse.json({error:"Category service is unavailable."},{status:503});}
}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return proxy(request,context,"PATCH")}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){return proxy(request,context,"DELETE")}
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!token)return NextResponse.json({error:"Authentication is required."},{status:401});
  const {id}=await context.params;
  try{
    const formData=await request.formData();
    const response=await fetch(getBackendApiUrl("categories/"+encodeURIComponent(id)+"/image"),{
      method:"POST",
      headers:{Authorization:"Bearer "+token},
      body:formData,
      cache:"no-store",
    });
    const data=await response.json().catch(()=>null);
    return NextResponse.json(data??{error:"Category image upload failed."},{status:response.status});
  }catch{return NextResponse.json({error:"Category service is unavailable."},{status:503});}
}
