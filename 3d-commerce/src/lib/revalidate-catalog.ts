import { revalidatePath, revalidateTag } from "next/cache";

const SHOP_CATALOG_PATH = "/shop";
const CATALOG_PRODUCTS_TAG = "catalog-products";

export function revalidateProductCatalog(productId?: string) {
  const normalizedId = productId?.trim();

  // Invalidate cached product data shared by catalog API routes.
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");

  // Invalidate the product detail page only when an ID is available.
  if (normalizedId) {
    revalidatePath("/product/" + encodeURIComponent(normalizedId));
  }

  // Refresh catalog listings and homepage product sections.
  revalidatePath(SHOP_CATALOG_PATH, "layout");
  revalidatePath("/");
}
