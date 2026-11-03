import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("WhatsApp number is also served at runtime, not only inlined at build time", () => {
  const route = read("../src/app/api/public-config/whatsapp/route.ts");
  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /process\.env\.NEXT_PUBLIC_WHATSAPP_NUMBER/);
  assert.match(read("../src/lib/whatsapp.ts"), /fetch\("\/api\/public-config\/whatsapp"\)/);
});

test("the floating icon and the footer share the runtime-aware config", () => {
  for (const file of ["WhatsAppBot", "Footer"]) {
    assert.match(read(`../src/components/layout/${file}.tsx`), /useWhatsAppConfig\(\)/, file);
  }
  assert.doesNotMatch(read("../src/components/layout/WhatsAppBot.tsx"), /process\.env/);
});
