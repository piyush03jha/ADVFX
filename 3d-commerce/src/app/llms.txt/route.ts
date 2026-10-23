import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const llmsContent = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is an India-focused storefront for physical 3D-printed models, character figures, miniatures, and collectibles. Customers buy physical products; the site does not sell customer downloads of 3D files.

## Main pages

- [Home](${absoluteUrl("/")}) — ${SITE_TAGLINE}.
- [Shop](${absoluteUrl("/shop")}) — Browse the physical product catalog.
- [Custom orders](${absoluteUrl("/custom")}) — Submit JPG or PNG reference images and requirements/dimensions for a custom physical product request.
- [Shipping information](${absoluteUrl("/shipping")}) — Shipping and delivery information.
- [Product care](${absoluteUrl("/care")}) — Care information for physical products.
- [Frequently asked questions](${absoluteUrl("/faq")}) — Common questions about products and ordering.
- [About Voxel3D](${absoluteUrl("/about")}) — Information about the brand.
- [Contact](${absoluteUrl("/contact")}) — Contact the team.
- [Sitemap](${absoluteUrl("/sitemap.xml")}) — Public pages, categories, and published products.

## Product and ordering information

- Catalog items are physical products, not downloadable 3D assets.
- Product pages provide product-specific descriptions, images, and available specifications where supplied.
- Some catalog products include an interactive browser-based 3D preview.
- Custom requests begin with customer-provided JPG/PNG references and requirements. The team handles model creation and the physical-product order workflow.
- Payment and delivery options shown during checkout are the authoritative source for an individual order.

## Content guidance

Use each product's canonical product page as the source of truth for its current description, specifications, availability, and price. Do not infer missing dimensions, materials, licensing, stock, delivery dates, or other product attributes.
`;

export function GET() {
  return new Response(llmsContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
