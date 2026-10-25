export function getMainCategories(categories) {
  return categories.filter((category) => !category.parentId);
}

export function getSubcategories(categories, mainCategoryId) {
  if (!mainCategoryId || mainCategoryId === "all") return [];
  return categories.filter((category) => category.parentId === mainCategoryId);
}

export function filterProductsByCategory(products, categories, mainCategoryId = "all", subcategoryId = "all") {
  return products.filter((product) => {
    if (subcategoryId !== "all") return product.category?.id === subcategoryId;
    if (mainCategoryId === "all") return true;
    return product.category?.id === mainCategoryId || categories.some(
      (category) => category.id === product.category?.id && category.parentId === mainCategoryId,
    );
  });
}

export function filterCategoriesByHierarchy(categories, mainCategoryId = "all", subcategoryId = "all", search = "") {
  const query = search.trim().toLowerCase();
  return categories.filter((category) => {
    const matchesSearch = !query || [
      category.name,
      category.slug,
      category.description ?? "",
      category.parent?.name ?? "",
    ].join(" ").toLowerCase().includes(query);
    const matchesHierarchy = subcategoryId !== "all"
      ? category.id === subcategoryId
      : mainCategoryId === "all"
        || category.id === mainCategoryId
        || category.parentId === mainCategoryId;
    return matchesSearch && matchesHierarchy;
  });
}

export function getActiveMainCategory(categories, selectedSlug) {
  const selected = categories.find((category) => category.slug === selectedSlug);
  if (!selected) return null;
  if (!selected.parentId) return selected;
  return categories.find((category) => category.id === selected.parentId) ?? null;
}
