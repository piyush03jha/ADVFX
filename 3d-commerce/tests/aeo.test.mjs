import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  AI_TXT_PRIVATE_PATHS,
  buildAiTxt,
  buildLlmsFullTxt,
  buildLlmsTxt,
} from "../src/lib/llms-content.mjs";
import {
  CUSTOM_ORDER_LIMITS,
  CUSTOM_ORDER_STEPS,
  EXTERNAL_REFERENCES,
  HOME_OPENING_ANSWER,
  ORDER_OPTIONS,
  READY_MADE_ORDER_STEPS,
} from "../src/lib/aeo-content.mjs";

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

test("llms.txt links to the full reference file", () => {
  const output = buildLlmsTxt({ siteUrl: "https://voxel3d.org" });
  assert.match(output, /\[Full reference\]\(https:\/\/voxel3d\.org\/llms-full\.txt\)/);
});

test("llms-full.txt keeps the llms.txt content and adds guides, order types and policies", () => {
  const output = buildLlmsFullTxt({
    siteUrl: "https://voxel3d.org",
    faqs: [{ question: "What is sold?", answer: "Physical products only." }],
  });

  assert.match(output, /### What is sold\?\nPhysical products only\./);
  assert.match(output, /## How to order a ready-made model, step by step/);
  assert.match(output, /## How to order a custom model, step by step/);
  assert.match(output, /## Order types compared/);
  assert.match(output, /## Policies in brief/);
  for (const step of [...READY_MADE_ORDER_STEPS, ...CUSTOM_ORDER_STEPS]) {
    assert.ok(output.includes(step.name), `missing step: ${step.name}`);
  }
  for (const row of ORDER_OPTIONS) assert.ok(output.includes(row.option));
  for (const reference of EXTERNAL_REFERENCES) assert.ok(output.includes(reference.url));
  assert.match(output, /at most 5 images, 50 MB in total/);
});

test("llms-full.txt does not invent prices, delivery times or return windows", () => {
  const output = buildLlmsFullTxt({ siteUrl: "https://voxel3d.org" });
  assert.doesNotMatch(output, /₹|\brs\.?\s?\d|\$\d/i);
  assert.doesNotMatch(output, /\b\d+\s*(business\s+|working\s+)?days?\b/i);
});

test("ai.txt mirrors the private paths in robots.ts and points to the AI summaries", () => {
  const output = buildAiTxt({ siteUrl: "https://voxel3d.org" });
  const robots = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");
  const disallowBlock = robots.match(/disallow:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const robotsPaths = [...disallowBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(AI_TXT_PRIVATE_PATHS, robotsPaths);
  for (const path of robotsPaths) assert.match(output, new RegExp(`^Disallow: ${path}$`, "m"));
  assert.match(output, /^Allow: \/$/m);
  assert.match(output, /llms-full\.txt/);
});

test("homepage opening answer is a direct, concrete answer of at least 50 words", () => {
  const words = HOME_OPENING_ANSWER.trim().split(/\s+/).length;
  assert.ok(words >= 50, `opening answer has ${words} words`);
  assert.match(HOME_OPENING_ANSWER, new RegExp(String(CUSTOM_ORDER_LIMITS.maxImages)));
  assert.match(HOME_OPENING_ANSWER, /physical 3D printed models/);
});

test("homepage answer section uses question headings and shared structured content", () => {
  const source = readFileSync(
    new URL("../src/components/home/HomeAbout.tsx", import.meta.url),
    "utf8",
  );
  const questionHeadings = [...source.matchAll(/>\s*((?:What|How|Why|When|Is|Does)[^<>{}]*\?)\s*<\/h[23]>/g)];

  assert.ok(questionHeadings.length >= 3, `found ${questionHeadings.length} question headings`);
  assert.match(source, /<ol /);
  assert.match(source, /<ul /);
  assert.match(source, /<table /);
  for (const reference of EXTERNAL_REFERENCES) assert.ok(source.includes(reference.url));

  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /<HomeAbout /);
  assert.match(home, /"@type": "HowTo"/);
});
