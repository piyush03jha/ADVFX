import { faqItems, type FAQItem } from "@/config/faq";
import { createLlmsResponse } from "@/lib/llms-content.mjs";
import { getBackendApiUrl } from "@/lib/backend-api";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type PublicFaq = Pick<FAQItem, "question" | "answer">;

async function loadPublicFaqs(): Promise<PublicFaq[]> {
  try {
    const response = await fetch(getBackendApiUrl("site-content/faq"), {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const payload = (await response.json()) as { value?: unknown };
      if (
        Array.isArray(payload.value) &&
        payload.value.length > 0 &&
        payload.value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as PublicFaq).question === "string" &&
            typeof (item as PublicFaq).answer === "string",
        )
      ) {
        return payload.value as PublicFaq[];
      }
    }
  } catch {
    // Keep the endpoint available when the content API is temporarily unavailable.
  }

  return faqItems;
}

export async function GET(): Promise<Response> {
  const faqs = await loadPublicFaqs();
  return createLlmsResponse({
    siteUrl: SITE_URL,
    description: SITE_DESCRIPTION,
    tagline: `${SITE_NAME}: ${SITE_TAGLINE}.`,
    faqs,
  });
}
