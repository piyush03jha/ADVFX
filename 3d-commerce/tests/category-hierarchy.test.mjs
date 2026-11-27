import test from "node:test";
import assert from "node:assert/strict";
import { getMainCategories, getSubcategories, filterProductsByCategory, filterCategoriesByHierarchy, getActiveMainCategory, getVisibleShopCategories, getPublicCategoryProductCount } from "../src/lib/category-hierarchy.mjs";

const categories = [
  { id: "figures", name: "Figures", slug: "figures", parentId: null },
  { id: "anime", name: "Anime", slug: "anime", parentId: "figures" },
  { id: "marvel", name: "Marvel", slug: "marvel", parentId: "figures" },
  { id: "toys", name: "Toys", slug: "toys", parentId: null },
];
const products = [
  { id: "p1", category: { id: "figures" } },
  { id: "p2", category: { id: "anime" } },
  { id: "p3", category: { id: "marvel" } },
  { id: "p4", category: { id: "toys" } },
  { id: "p5", category: null },
];

test("main categories excludes subcategories", () => {
  assert.deepEqual(getMainCategories(categories).map((category) => category.id), ["figures", "toys"]);
});

test("main category with no children returns empty subcategory list", () => {
  assert.deepEqual(getSubcategories(categories, "toys"), []);
  assert.deepEqual(getSubcategories(categories, "all"), []);
});

test("main category selection includes its products and products in its subcategories", () => {
  assert.deepEqual(filterProductsByCategory(products, categories, "figures").map((product) => product.id), ["p1", "p2", "p3"]);
});

test("subcategory selection narrows to only that subcategory", () => {
  assert.deepEqual(filterProductsByCategory(products, categories, "figures", "anime").map((product) => product.id), ["p2"]);
});

test("all categories includes uncategorized products", () => {
  assert.deepEqual(filterProductsByCategory(products, categories).map((product) => product.id), ["p1", "p2", "p3", "p4", "p5"]);
});

test("category management filter supports parent plus children and search", () => {
  assert.deepEqual(filterCategoriesByHierarchy(categories, "figures").map((category) => category.id), ["figures", "anime", "marvel"]);
  assert.deepEqual(filterCategoriesByHierarchy(categories, "figures", "marvel").map((category) => category.id), ["marvel"]);
  assert.deepEqual(filterCategoriesByHierarchy(categories, "all", "all", "toys").map((category) => category.id), ["toys"]);
});

test("shop selection resolves a selected subcategory back to its main category", () => {
  assert.equal(getActiveMainCategory(categories, "marvel")?.id, "figures");
  assert.equal(getActiveMainCategory(categories, "figures")?.id, "figures");
  assert.equal(getActiveMainCategory(categories, "missing"), null);
});


test("public category visibility counts only active categories and their active children", () => {
  const rows = [
    { id: "parent", name: "Parent", slug: "parent", isActive: true, _count: { products: 0 } },
    { id: "child", name: "Child", slug: "child", parentId: "parent", isActive: true, _count: { products: 3 } },
    { id: "empty", name: "Empty", slug: "empty", parentId: "parent", isActive: true, _count: { products: 0 } },
    { id: "hidden-child", name: "Hidden child", slug: "hidden-child", parentId: "parent", isActive: false, _count: { products: 5 } },
    { id: "hidden-parent", name: "Hidden parent", slug: "hidden-parent", isActive: false, _count: { products: 1 } },
    { id: "orphan", name: "Orphan", slug: "orphan", parentId: "hidden-parent", isActive: true, _count: { products: 2 } },
    { id: "direct", name: "Direct", slug: "direct", isActive: true, _count: { products: 1 } },
    { id: "only-hidden", name: "Only hidden", slug: "only-hidden", isActive: true, _count: { products: 0 } },
    { id: "inactive", name: "Inactive", slug: "inactive", parentId: "only-hidden", isActive: false, _count: { products: 10 } },
  ];
  assert.deepEqual(getVisibleShopCategories(rows).map(c => c.id), ["parent", "child", "direct"]);
  assert.equal(getPublicCategoryProductCount(rows[0], rows), 3);
  assert.deepEqual(getVisibleShopCategories(rows.filter(c => c.id !== "child")).map(c => c.id), ["direct"]);
});
