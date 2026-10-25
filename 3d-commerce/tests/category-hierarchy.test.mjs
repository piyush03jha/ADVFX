import test from "node:test";
import assert from "node:assert/strict";
import { getMainCategories, getSubcategories, filterProductsByCategory, filterCategoriesByHierarchy, getActiveMainCategory } from "../src/lib/category-hierarchy.mjs";

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
