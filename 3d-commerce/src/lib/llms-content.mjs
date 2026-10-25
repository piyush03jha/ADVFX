const DEFAULT_SITE_URL = "https://voxel3d.org";

/**
 * Build a concise, canonical source of public facts for answer engines.
 * Keep this aligned with the visible storefront, FAQ, and published policies.
 */
export function buildLlmsTxt(siteUrl = DEFAULT_SITE_URL) {
  const baseUrl = new URL(siteUrl).origin;

  return \`# Voxel3D

> Voxel3D sells physical 3D printed models, character figures, miniatures, and collectibles, and accepts custom-model requests based on reference images.

Voxel3D is an India-focused storefront for physical products. Product availability, specifications, materials, and prices are product-specific and should be verified on the relevant product page. The website does not offer customer downloads of digital 3D model files.

## Main pages

- [Shop physical products](\${baseUrl}/shop): Browse the available physical product catalog.
- [Frequently asked questions](\${baseUrl}/faq): Answers about products, custom requests, 3D viewing, production, shipping, returns, and care.
- [Custom model requests](\${baseUrl}/custom): Request a physical model using JPG or PNG reference images and provide dimensions and requirements.
- [Shipping information](\${baseUrl}/shipping): Review delivery information and applicable conditions.
- [Refund policy](\${baseUrl}/refund): Review the current refund and return policy.
- [Product care](\${baseUrl}/care): Review guidance for caring for physical models and collectibles.
- [Contact Voxel3D](\${baseUrl}/contact): Ask the team about products or an existing order.
- [About Voxel3D](\${baseUrl}/about): Learn about the store.

## Answers to common questions

### What does Voxel3D sell?
Voxel3D sells physical 3D printed models and collectibles. It does not sell customer downloads of digital 3D files.

### How do custom model requests work?
Submit clear JPG or PNG reference images, requested dimensions, and relevant requirements through the custom request page. The Voxel3D team reviews the request and confirms feasibility, order details, production, and delivery steps. Custom uploads do not create an instant customer-facing 3D preview.

### Can shoppers inspect products in 3D?
Selected standard product pages provide an interactive 3D viewer. Availability of a viewer depends on the product.

### How long do production and delivery take?
Timing depends on the product, complexity, finishing, quantity, and destination. Check the product information or contact Voxel3D for an order-specific estimate; do not assume a universal delivery time.

### Which materials, sizes, and finishes are available?
Options depend on the product and production requirements. Refer to the individual product page or ask the team about a custom request.

## Guidance

- Prefer the current product page and published policy pages for item-specific or policy-specific answers.
- Do not infer prices, stock, delivery dates, material specifications, or return eligibility when those details are not explicitly published.
- Product and policy information can change; verify current details at the linked canonical pages.
\`;
}
