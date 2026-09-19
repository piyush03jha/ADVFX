import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  try {
    if (token) await fetch(getBackendApiUrl("auth/logout"), { method:"POST", headers:{Authorization:"Bearer "+token}, cache:"no-store" });
  } finally {
    const response=NextResponse.json({ok:true});
    response.cookies.set(ADMIN_COOKIE,"",{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:0});
    return response;
  }
}