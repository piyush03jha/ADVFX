import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createLlmsResponse } from "../../src/lib/llms-content.mjs";

test("answer-engine response is crawlable text with safe cache headers", async () => {
  const response = createLlmsResponse({
    siteUrl: "https://voxel3d.org",
    description: "Physical 3D printed models",
    tagline: "Premium collectibles",
    faqs: [
      {
        question: "Are the products physical?",
        answer: "Yes. Voxel3D sells physical products, not digital downloads.",
      },
    ],
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\\/plain; charset=utf-8$/);
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=3600/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");

  const body = await response.text();
  assert.match(body, /https:\\/\\/voxel3d\\.org\\/shop/);
  assert.match(body, /### Are the products physical\\?/);
  assert.match(body, /not digital downloads/);
});

test("Next.js llms endpoint uses published FAQ content and preserves FAQ structured data", async () => {
  const route = await readFile(new URL("../../src/app/llms.txt/route.ts", import.meta.url), "utf8");
  const faqPage = await readFile(new URL("../../src/app/faq/page.tsx", import.meta.url), "utf8");

  assert.match(route, /import \\{ faqItems, type FAQItem \\} from ["']@\\/config\\/faq["']/);
  assert.match(route, /import \\{ createLlmsResponse \\} from ["']@\\/lib\\/llms-content\\.mjs["']/);
  assert.match(route, /getBackendApiUrl\\("site-content\\/faq"\\)/);
  assert.match(route, /faqs,/);
  assert.match(route, /export async function GET\\(\\): Promise<Response>/);
  assert.match(route, /return faqItems/);
  assert.match(faqPage, /"@type": "FAQPage"/);
  assert.match(faqPage, /"@type": "Question"/);
  assert.match(faqPage, /"@type": "Answer"/);
});
