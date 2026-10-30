import { createLlmsSmallResponse } from "@/lib/llms-content.mjs";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// Compact summary for AI tools with a small context window. Static facts only,
// so it does not need the FAQ fetch that llms.txt and llms-full.txt use.
export async function GET(): Promise<Response> {
  return createLlmsSmallResponse({
    siteUrl: SITE_URL,
    description: SITE_DESCRIPTION,
  });
}
