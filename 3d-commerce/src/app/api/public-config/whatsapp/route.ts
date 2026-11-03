import { NextResponse } from "next/server";

// Read at request time, never at build time, so a variable that exists only on the
// running host (e.g. a Cloudflare variable) is still picked up by the client.
export const dynamic = "force-dynamic";

export function GET() {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const url = (process.env.NEXT_PUBLIC_WHATSAPP_URL ?? process.env.WHATSAPP_URL ?? "").trim();

  return NextResponse.json(
    { number, url },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
