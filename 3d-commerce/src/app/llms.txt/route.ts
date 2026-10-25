import { faqItems } from "@/config/faq";
import { buildLlmsTxt } from "@/lib/llms-content.mjs";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export function GET(): Response {
  const content = buildLlmsTxt({
    siteUrl: SITE_URL,
    description: SITE_DESCRIPTION,
    tagline: `${SITE_NAME}: ${SITE_TAGLINE}.`,
    faqs: faqItems,
  });

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
