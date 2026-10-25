import { faqItems } from "@/config/faq";
import { createLlmsResponse } from "@/lib/llms-content.mjs";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function GET(): Response {
  return createLlmsResponse({
    siteUrl: SITE_URL,
    description: SITE_DESCRIPTION,
    tagline: `${SITE_NAME}: ${SITE_TAGLINE}.`,
    faqs: faqItems,
  });
}
