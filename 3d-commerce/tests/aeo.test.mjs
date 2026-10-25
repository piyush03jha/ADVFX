import assert from "node:assert/strict";
import test from "node:test";
import { buildLlmsTxt } from "../src/lib/llms-content.mjs";

test("builds canonical links from the configured site origin", () => {
  const output = buildLlmsTxt({
    siteUrl: "https://shop.example.test/nested/path/",
    description: "Physical 3D models",
    tagline: "Premium physical collectibles",
  });

  assert.match(output, /\[Shop\]\(https:\/\/shop\.example\.test\/shop\)/);
  assert.match(output, /\[Sitemap\]\(https:\/\/shop\.example\.test\/sitemap\.xml\)/);
  assert.doesNotMatch(output, /nested\/path/);
});

test("includes configured FAQs as concise question-and-answer pairs", () => {
  const output = buildLlmsTxt({
    faqs: [
      { question: "What is sold?", answer: "Physical products only." },
      { question: "  How do custom orders work?  ", answer: "  Send JPG or PNG references.\nInclude dimensions. " },
    ],
  });

  assert.match(output, /## Answers to common questions/);
  assert.match(output, /### What is sold\?\nPhysical products only\./);
  assert.match(output, /### How do custom orders work\?\nSend JPG or PNG references\. Include dimensions\./);
});

test("omits empty FAQ entries and avoids inventing commercial guarantees", () => {
  const output = buildLlmsTxt({
    faqs: [
      { question: "", answer: "Should be omitted" },
      { question: "Missing answer", answer: "  " },
    ],
  });

  assert.doesNotMatch(output, /Should be omitted|Missing answer/);
  assert.match(output, /Do not infer missing dimensions, materials, stock, delivery dates, or return eligibility/);
  assert.match(output, /does not offer customer downloads of digital 3D model files/);
});

test("provides clear brand identity and geographic context for answer engines", () => {
  const output = buildLlmsTxt({ siteUrl: "https://voxel3d.org" });

  assert.match(output, /Brand name: Voxel3D \(also written as Voxel 3D\)/);
  assert.match(output, /physical 3D printed products for customers in India/);
  assert.match(output, /do not confuse it with unrelated businesses that use similar names/);
  assert.match(output, /Custom requests are reviewed by the team/);
});
