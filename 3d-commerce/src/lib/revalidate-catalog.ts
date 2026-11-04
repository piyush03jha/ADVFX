import { revalidatePath, revalidateTag } from "next/cache";

const SHOP_CATALOG_PATH = "/shop";
const CATALOG_PRODUCTS_TAG = "catalog-products";

export function revalidateProductCatalog(productId?: string) {
  const normalizedId = productId?.trim();

  // Admin edits must show up on the very next storefront request. The "max"
  // profile serves stale data while it refreshes in the background, so expire
  // the tag immediately instead.
  revalidateTag(CATALOG_PRODUCTS_TAG, { expire: 0 });

  // Public product URLs are slug-based (/product/<slug>) while admin routes
  // only know the product id, so invalidate every product detail page rather
  // than a path that never matches the cached slug page.
  revalidatePath("/product/[id]", "page");
  if (normalizedId) {
    revalidatePath("/product/" + encodeURIComponent(normalizedId));
  }

  // Refresh catalog listings and homepage product sections.
  revalidatePath(SHOP_CATALOG_PATH, "layout");
  revalidatePath("/");
}
