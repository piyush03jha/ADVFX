import test from "node:test";
import assert from "node:assert/strict";
import { getSubcategories, filterProductsByCategory, getActiveMainCategory } from "../../src/lib/category-hierarchy.mjs";

test("admin filter flow works with and without subcategories", () => {
  const categories = [
    { id: "main-a", name: "Main A", slug: "main-a", parentId: null },
    { id: "sub-a", name: "Sub A", slug: "sub-a", parentId: "main-a" },
    { id: "main-b", name: "Main B", slug: "main-b", parentId: null },
  ];
  const products = [
    { id: "a", category: { id: "main-a" } },
    { id: "b", category: { id: "sub-a" } },
    { id: "c", category: { id: "main-b" } },
  ];
  assert.deepEqual(getSubcategories(categories, "main-a").map((item) => item.id), ["sub-a"]);
  assert.deepEqual(getSubcategories(categories, "main-b"), []);
  assert.deepEqual(filterProductsByCategory(products, categories, "main-b").map((item) => item.id), ["c"]);
  assert.deepEqual(filterProductsByCategory(products, categories, "main-a", "sub-a").map((item) => item.id), ["b"]);
});

test("shop category selection displays only selected main category's subcategories", () => {
  const categories = [
    { id: "a", name: "A", slug: "a", parentId: null },
    { id: "a1", name: "A1", slug: "a1", parentId: "a" },
    { id: "b", name: "B", slug: "b", parentId: null },
    { id: "b1", name: "B1", slug: "b1", parentId: "b" },
  ];
  const selectedMain = getActiveMainCategory(categories, "a1");
  assert.equal(selectedMain?.id, "a");
  assert.deepEqual(getSubcategories(categories, selectedMain.id).map((item) => item.slug), ["a1"]);
});
