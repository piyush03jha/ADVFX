import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { buildShopSearch, DEFAULT_SHOP_QUERY } from "../src/lib/shop-query.ts";

const grid = readFileSync(new URL("../src/components/shop/ShopProductGrid.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../src/components/shop/ShopSearch.tsx", import.meta.url), "utf8");

test("a category page can switch to another category instead of ignoring the click", () => {
  const handler = grid.slice(grid.indexOf("const handleCategoryChange"), grid.indexOf("const handlePageChange"));

  assert.doesNotMatch(handler, /if \(lockedCategory\) return;/, "clicks on a category page must not be dropped");
  assert.match(handler, /categoryPath\(categorySlug\)/, "another category opens its own page");
  assert.match(handler, /SHOP_ROOT/, "clicking the open category again shows the whole shop");
});

test("the category rail and filter sheet show the page's real category", () => {
  assert.match(grid, /const effectiveCategories = lockedCategory \? \[lockedCategory\] : state\.categories;/);
  assert.match(grid, /selectedCategories=\{effectiveCategories\}/);
  assert.match(grid, /categories: effectiveCategories,/);
  assert.doesNotMatch(grid, /selectedCategories=\{state\.categories\}/);
});

test("All Models leaves a category page", () => {
  assert.match(grid, /const showAllModels = \(\) => \{[\s\S]*?SHOP_ROOT\);/);
  assert.match(grid, /onShowAll=\{showAllModels\}/);
});

test("search looks through the whole catalog, not just the open category", () => {
  assert.match(grid, /navigate\(\{ q: searchText, categories: \[\] \}, "replace", SHOP_ROOT\)/);
});

test("the search box keeps the cursor when results rebuild the grid", () => {
  assert.match(grid, /SEARCH_FOCUS_KEY/);
  assert.match(grid, /inputRef=\{searchInputRef\}/);
  assert.match(search, /ref=\{inputRef\}/);
});

test("category pages carry the category in the path and /shop carries it in the query", () => {
  const state = { ...DEFAULT_SHOP_QUERY, categories: ["anime"], q: "batman" };

  assert.equal(buildShopSearch(state, { omitCategory: true }), "?q=batman");
  assert.equal(buildShopSearch(state, { omitCategory: false }), "?q=batman&category=anime");
  assert.match(grid, /omitCategory: path !== SHOP_ROOT/);
});
