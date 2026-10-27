import { faqItems, type FAQItem } from "@/config/faq";
import { getBackendApiUrl } from "@/lib/backend-api";

export type PublicFaq = Pick<FAQItem, "question" | "answer">;

/**
 * Public FAQ entries for machine-readable files (llms.txt, llms-full.txt).
 * Uses the content API when it answers and falls back to the bundled FAQ.
 */
export async function loadPublicFaqs(revalidate = 3600): Promise<PublicFaq[]> {
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
