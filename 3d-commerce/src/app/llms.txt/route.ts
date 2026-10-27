import { createLlmsResponse } from "@/lib/llms-content.mjs";
import { loadPublicFaqs } from "@/lib/public-faqs";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const faqs = await loadPublicFaqs(revalidate);
  return createLlmsResponse({
    siteUrl: SITE_URL,
    description: SITE_DESCRIPTION,
    tagline: `${SITE_NAME}: ${SITE_TAGLINE}.`,
    faqs,
  });
}
