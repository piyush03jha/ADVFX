import { revalidatePath } from "next/cache";

const SHOP_CATALOG_PATH = "/shop";

export function revalidateProductCatalog(productId: string) {
  const normalizedId = productId.trim();
  if (!normalizedId) return;

  // The product detail route has its own cached backend fetch, while the
  // shop layout covers /shop and all category listing pages beneath it.
  revalidatePath("/product/" + encodeURIComponent(normalizedId));
  revalidatePath(SHOP_CATALOG_PATH, "layout");
}
