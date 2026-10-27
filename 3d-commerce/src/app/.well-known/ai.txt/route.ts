import { createAiTxtResponse } from "@/lib/llms-content.mjs";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
  return createAiTxtResponse({ siteUrl: SITE_URL });
}
