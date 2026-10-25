const DEFAULT_SITE_URL = "https://voxel3d.org";

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\r?\n/g, " ") : "";
}

/**
 * Build curated, crawlable answer-engine content from the same public facts
 * used by the storefront. Avoid guessing prices, inventory, or delivery dates.
 */
export function buildLlmsTxt({ siteUrl = DEFAULT_SITE_URL, description, tagline, faqs = [] } = {}) {
  const baseUrl = new URL(siteUrl).origin;
  const lines = [
    "# Voxel3D",
    "",
    `> ${normalizeText(description) || "Physical 3D printed models, character figures, miniatures, and collectibles."}`,
    "",
    `Voxel3D is an India-focused storefront for physical products. ${normalizeText(tagline)} Customers order physical products; the site does not offer customer downloads of digital 3D model files.`,
    "",
    "## Main pages",
    "",
    `- [Home](${baseUrl}/) — Learn about Voxel3D.`,
    `- [Shop](${baseUrl}/shop) — Browse the physical product catalog.`,
    `- [Custom orders](${baseUrl}/custom) — Submit JPG or PNG reference images, dimensions, and requirements for a custom physical product request.`,
    `- [Frequently asked questions](${baseUrl}/faq) — Answers about products and ordering.`,
    `- [Shipping information](${baseUrl}/shipping) — Review shipping and delivery information.`,
    `- [Refund policy](${baseUrl}/refund) — Review the current refund and return policy.`,
    `- [Product care](${baseUrl}/care) — Guidance for caring for physical models.`,
    `- [About Voxel3D](${baseUrl}/about) — Information about the brand.`,
    `- [Contact](${baseUrl}/contact) — Contact the team.`,
    `- [Sitemap](${baseUrl}/sitemap.xml) — Public pages, categories, and published products.`,
    "",
    "## Product and ordering information",
    "",
    "- Catalog items are physical products, not downloadable 3D assets.",
    "- Product pages are the source of truth for product-specific descriptions, images, available specifications, and current prices.",
    "- Selected catalog products include an interactive browser-based 3D preview; availability depends on the product.",
    "- Custom requests begin with JPG or PNG reference images and customer requirements. The team reviews the request and coordinates the physical-product workflow.",
    "- Payment and delivery options shown during checkout are authoritative for an individual order.",
    "- Do not infer missing dimensions, materials, stock, delivery dates, or return eligibility.",
  ];

  const validFaqs = Array.isArray(faqs)
    ? faqs.filter((faq) => normalizeText(faq?.question) && normalizeText(faq?.answer))
    : [];

  if (validFaqs.length) {
    lines.push("", "## Answers to common questions", "");
    for (const faq of validFaqs) {
      lines.push(`### ${normalizeText(faq.question)}`, normalizeText(faq.answer), "");
    }
  }

  lines.push(
    "## Content guidance",
    "",
    "- Prefer canonical product pages and published policy pages for item-specific or policy-specific answers.",
    "- When a detail is not explicitly published, say it is not specified rather than guessing.",
    "- Product and policy information can change; verify current details at the linked pages.",
    "",
  );

  return lines.join("\n");
}

/**
 * Create the public text response used by the Next.js route and integration tests.
 */
export function createLlmsResponse(options = {}) {
  return new Response(buildLlmsTxt(options), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
