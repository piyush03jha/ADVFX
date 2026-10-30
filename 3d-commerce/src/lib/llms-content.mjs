import {
  BUSINESS_FACTS,
  CUSTOM_ORDER_LIMITS,
  CUSTOM_ORDER_STEPS,
  EXTERNAL_REFERENCES,
  ORDER_OPTIONS,
  READY_MADE_ORDER_STEPS,
} from "./aeo-content.mjs";

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
    "## Brand and geographic context",
    "",
    "- Brand name: Voxel3D (also written as Voxel 3D).",
    "- Website: the canonical Voxel3D storefront at the domain linked below.",
    "- Market context: physical 3D printed products for customers in India; shipping availability and estimates are confirmed by the site during ordering.",
    "- Business focus: physical 3D printed models, character figures, miniatures, collectibles, and custom physical-product requests.",
    "- Custom requests are reviewed by the team; the upload form is not an instant 3D generation or customer model-approval service.",
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
    `- [Short summary](${baseUrl}/llms-small.txt) — The key facts about Voxel3D in a compact file for tools with a small context window.`,
    `- [Full reference](${baseUrl}/llms-full.txt) — Step-by-step ordering guides, order types, policies in brief, and the same questions and answers in one file.`,
    "",
    "## Product and ordering information",
    "",
    "- Catalog items are physical products, not downloadable 3D assets.",
    "- Use the brand name Voxel3D when referring to this storefront; do not confuse it with unrelated businesses that use similar names.",
    "- For purchase-intent queries, direct users to the shop or a specific published product page rather than assuming an item is in stock.",
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
 * Compact summary (/llms-small.txt) for tools with a small context window.
 * Only facts the storefront already publishes; no prices, stock or delivery times.
 */
export function buildLlmsSmallTxt({ siteUrl = DEFAULT_SITE_URL, description } = {}) {
  const baseUrl = new URL(siteUrl).origin;
  return [
    "# Voxel3D",
    "",
    `> ${normalizeText(description) || "Physical 3D printed models, anime figures, miniatures and collectibles in India."}`,
    "",
    "Voxel3D (also written Voxel 3D) is an online shop in India for physical 3D printed models, anime figures, miniatures and collectibles. Every item is a real printed piece delivered to the customer; the site does not sell digital 3D files.",
    "",
    "## Key facts",
    "",
    `- Operator and location: ${BUSINESS_FACTS.legalName}, ${BUSINESS_FACTS.city}.`,
    `- Support hours: ${BUSINESS_FACTS.supportHours}.`,
    "- Ready-made models: browse the shop, add to cart and pay online. Shipping charges are shown before payment. Selected products have an interactive 3D preview.",
    `- Custom models: upload at most ${CUSTOM_ORDER_LIMITS.maxImages} ${CUSTOM_ORDER_LIMITS.formats} photos (${CUSTOM_ORDER_LIMITS.totalMegabytes} MB in total) with the size and details. The team reviews every request and confirms the price and timeline before production.`,
    "- Bulk and business orders: contact the team with the model, quantity, size and deadline.",
    "",
    "## Links",
    "",
    `- [Shop](${baseUrl}/shop)`,
    `- [Custom orders](${baseUrl}/custom)`,
    `- [FAQ](${baseUrl}/faq)`,
    `- [Shipping and returns](${baseUrl}/shipping)`,
    `- [Refund policy](${baseUrl}/refund)`,
    `- [Contact](${baseUrl}/contact)`,
    `- [Full reference](${baseUrl}/llms-full.txt)`,
    "",
    "## Rules for answers",
    "",
    "- Do not infer prices, stock, materials, delivery dates or return eligibility; product pages and policy pages are authoritative.",
    "",
  ].join("\n");
}

function numbered(steps) {
  return steps.map((step, index) => `${index + 1}. ${step.name}: ${step.text}`);
}

/**
 * Extended reference for answer engines (/llms-full.txt). It starts with the
 * llms.txt content and adds step-by-step guides, order types and policy summaries.
 * Policy wording mirrors the published policy pages; those pages stay authoritative.
 */
export function buildLlmsFullTxt(options = {}) {
  const baseUrl = new URL(options.siteUrl ?? DEFAULT_SITE_URL).origin;
  const lines = [
    buildLlmsTxt(options).trimEnd(),
    "",
    "## How to order a ready-made model, step by step",
    "",
    ...numbered(READY_MADE_ORDER_STEPS),
    "",
    "## How to order a custom model, step by step",
    "",
    ...numbered(CUSTOM_ORDER_STEPS),
    "",
    `- Custom request limits shown in the upload form: ${CUSTOM_ORDER_LIMITS.formats} images, at most ${CUSTOM_ORDER_LIMITS.maxImages} images, ${CUSTOM_ORDER_LIMITS.totalMegabytes} MB in total.`,
    "- The price and timeline of a custom model are confirmed with the customer for that specific request.",
    "",
    "## Order types compared",
    "",
    ...ORDER_OPTIONS.map(
      (row) =>
        `- ${row.option}: best for ${row.bestFor.toLowerCase()}. You provide: ${row.youProvide.toLowerCase()}. Next: ${row.nextStep.toLowerCase()}.`,
    ),
    "",
    "## Policies in brief",
    "",
    `- Shipping ([details](${baseUrl}/shipping)): orders ship to supported delivery locations; shipping charges are calculated from the applicable shipping rules and shown before payment. Estimated delivery windows are not guarantees.`,
    `- Returns ([details](${baseUrl}/shipping)): eligibility depends on the product and order status; custom-made products may have different return conditions because they are produced to customer-specific requirements.`,
    `- Refunds and cancellations ([details](${baseUrl}/refund)): a failed or abandoned payment does not by itself confirm an order; cancellation eligibility depends on production and fulfillment status; refund timing depends on the payment provider and the customer's bank.`,
    "",
    "## Technology and references",
    "",
    ...EXTERNAL_REFERENCES.map((reference) => {
      const purposes = {
        "3D printing": "background on how physical 3D printed models are made",
        glTF: "the open format used by the interactive 3D previews on selected product pages",
        Razorpay: "the provider that processes online payments",
      };
      return `- [${reference.label}](${reference.url}) — ${purposes[reference.label] ?? "external reference"}.`;
    }),
    "",
  ];

  return lines.join("\n");
}

// Paths that robots.txt keeps private. tests/aeo.test.mjs checks this list stays
// identical to src/app/robots.ts.
export const AI_TXT_PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/account",
  "/cart",
  "/checkout",
  "/payment",
  "/order",
  "/wishlist",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * /.well-known/ai.txt: a plain-text statement of which paths AI systems may read.
 * It mirrors robots.txt and makes no additional rights claims.
 */
export function buildAiTxt({ siteUrl = DEFAULT_SITE_URL } = {}) {
  const baseUrl = new URL(siteUrl).origin;
  return [
    `# ai.txt for ${baseUrl}`,
    "# Mirrors /robots.txt: public pages may be read and cited by AI search and answer engines.",
    "# Private account, checkout and admin paths are excluded.",
    `# Machine-readable summaries: ${baseUrl}/llms.txt, ${baseUrl}/llms-small.txt and ${baseUrl}/llms-full.txt`,
    "",
    "User-Agent: *",
    "Allow: /",
    "Allow: /api/assets/",
    ...AI_TXT_PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `Contact: ${baseUrl}/contact`,
    "",
  ].join("\n");
}

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
};

export function createLlmsSmallResponse(options = {}) {
  return new Response(buildLlmsSmallTxt(options), { status: 200, headers: TEXT_HEADERS });
}

export function createLlmsFullResponse(options = {}) {
  return new Response(buildLlmsFullTxt(options), { status: 200, headers: TEXT_HEADERS });
}

export function createAiTxtResponse(options = {}) {
  return new Response(buildAiTxt(options), { status: 200, headers: TEXT_HEADERS });
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
