export interface HierarchyCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  description?: string | null;
}
export function getMainCategories<T extends HierarchyCategory>(categories: T[]): T[];
export function getSubcategories<T extends HierarchyCategory>(categories: T[], mainCategoryId: string): T[];
export function filterProductsByCategory<T extends { category?: { id: string } | null }, C extends HierarchyCategory>(products: T[], categories: C[], mainCategoryId?: string, subcategoryId?: string): T[];
export function filterCategoriesByHierarchy<T extends HierarchyCategory>(categories: T[], mainCategoryId?: string, subcategoryId?: string, search?: string): T[];
export function getActiveMainCategory<T extends HierarchyCategory>(categories: T[], selectedSlug: string): T | null;
