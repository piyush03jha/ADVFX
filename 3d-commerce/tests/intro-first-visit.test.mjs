import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("first-time visitors get a cover from the first paint, so the site is not shown and then hidden", () => {
  const layout = read("../src/app/layout.tsx");
  assert.match(layout, /setAttribute\("data-intro","pending"\)/);
  assert.match(layout, /setTimeout\(function\(\)\{d\.removeAttribute\("data-intro"\)\},8000\)/, "safety timer so the page can never stay covered");

  const css = read("../src/app/globals.css");
  const rule = css.slice(css.indexOf('html[data-intro="pending"] body::before'));
  assert.match(rule, /pointer-events: none;/, "the cover never blocks clicks");
});

test("the intro can never leave the overlay or the cover on screen", () => {
  const intro = read("../src/components/intro/LogoIntro.tsx");
  assert.match(intro, /HARD_STOP_MS = 9000/);
  assert.match(intro, /releaseCover\(\)/);
  assert.match(intro, /visibility: show \? "visible" : "hidden"/);
  assert.match(read("../src/components/layout/SiteChrome.tsx"), /removeAttribute\("data-intro"\)/);
});

test("the hero waits for the intro before starting its heavy 3D work", () => {
  assert.match(read("../src/components/home/Hero.tsx"), /const introDone = useIntroDone\(\);[\s\S]*if \(!introDone\) return;/);
  const gate = read("../src/lib/introGate.ts");
  assert.match(gate, /export function useIntroDone/);
  assert.match(gate, /setTimeout\(finish, 7000\)/, "never waits forever");
});
