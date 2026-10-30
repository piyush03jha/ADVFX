import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  AI_TXT_PRIVATE_PATHS,
  buildAiTxt,
  buildLlmsFullTxt,
  buildLlmsSmallTxt,
  buildLlmsTxt,
} from "../src/lib/llms-content.mjs";
import {
  BUSINESS_FACTS,
  CUSTOM_ORDER_LIMITS,
  CUSTOM_ORDER_STEPS,
  EXTERNAL_REFERENCES,
  FACT_FAQS,
  HOME_OPENING_ANSWER,
  ORDER_OPTIONS,
  ORDER_TYPES_FAQ_ID,
  READY_MADE_ORDER_STEPS,
  describeCatalog,
  mergeFactFaqs,
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

  // The long answer section was moved from the landing page to /about on purpose
  // (commit a7ec2c2); the landing page keeps its sections and gets its answers
  // from the FAQ, so only /about renders it and the HowTo schema points there.
  const about = readFileSync(new URL("../src/app/about/page.tsx", import.meta.url), "utf8");
  assert.match(about, /<HomeAbout /);
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(home, /<HomeAbout /);
  assert.match(home, /"@type": "HowTo"/);
  assert.match(home, /\/about#how-to-order/);
});

test("llms-small.txt is a compact summary with the key published facts", () => {
  const output = buildLlmsSmallTxt({ siteUrl: "https://voxel3d.org", description: "Physical 3D models" });

  assert.ok(output.length < 3000, `llms-small.txt is ${output.length} characters`);
  assert.match(output, /^# Voxel3D/m);
  assert.match(output, /physical 3D printed models, anime figures, miniatures and collectibles/);
  assert.ok(output.includes(BUSINESS_FACTS.city));
  assert.ok(output.includes(BUSINESS_FACTS.supportHours));
  assert.match(output, /at most 5 JPG or PNG photos \(50 MB in total\)/);
  assert.match(output, /\[Full reference\]\(https:\/\/voxel3d\.org\/llms-full\.txt\)/);
  assert.match(output, /does not sell digital 3D files/);
});

test("llms-small.txt does not invent prices, delivery times or return windows", () => {
  const output = buildLlmsSmallTxt({ siteUrl: "https://voxel3d.org" });
  assert.doesNotMatch(output, /₹|\brs\.?\s?\d|\$\d/i);
  assert.doesNotMatch(output, /\b\d+\s*(business\s+|working\s+)?days?\b/i);
});

test("llms.txt and ai.txt point to llms-small.txt", () => {
  assert.match(buildLlmsTxt({ siteUrl: "https://voxel3d.org" }), /\[Short summary\]\(https:\/\/voxel3d\.org\/llms-small\.txt\)/);
  assert.match(buildAiTxt({ siteUrl: "https://voxel3d.org" }), /llms-small\.txt/);
});

test("FAQ questions are real headings wrapping the toggle button", () => {
  const faq = readFileSync(new URL("../src/components/home/FAQ.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(faq, /role="heading"/);
  assert.match(faq, /<h3 [^>]*>\s*<button/);
});

test("homepage keeps its existing section order", () => {
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const order = ["<Hero />", "<BestSellers", "<ShopByCategory />", "<NewArrivals", "<CustomBuild />", "<BulkOrder />", "<Reviews />", "<FAQ "]
    .map((tag) => home.indexOf(tag, home.indexOf("<main")));
  assert.ok(order.every((index) => index > -1), `missing section: ${JSON.stringify(order)}`);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("fact FAQs are merged into the FAQ list once and never duplicate admin entries", () => {
  const admin = [{ id: "custom-model-process", question: "How do custom 3D printed model orders work?", answer: "x" }];
  const merged = mergeFactFaqs(admin);

  assert.equal(merged[0], admin[0], "admin entries keep their order and come first");
  assert.equal(merged.length, admin.length + FACT_FAQS.length);
  assert.equal(new Set(merged.map((item) => item.id)).size, merged.length);
  assert.deepEqual(mergeFactFaqs(merged), merged, "merging twice changes nothing");

  const customised = mergeFactFaqs([{ id: "x", question: "WHAT IS VOXEL3D?", answer: "admin wording" }]);
  assert.equal(customised.filter((item) => item.question.toLowerCase() === "what is voxel3d?").length, 1);
  assert.deepEqual(mergeFactFaqs(undefined).map((item) => item.id), FACT_FAQS.map((item) => item.id));
});

test("fact FAQs are questions that state published facts and invent no prices or delivery times", () => {
  for (const faq of FACT_FAQS) {
    assert.match(faq.question, /\?$/, `${faq.id} is phrased as a question`);
    assert.doesNotMatch(faq.answer, /₹|\brs\.?\s?\d|\$\d/i, `${faq.id} states a price`);
    assert.doesNotMatch(faq.answer, /\b\d+\s*(business\s+|working\s+)?days?\b/i, `${faq.id} states a delivery time`);
  }
  const text = FACT_FAQS.map((faq) => faq.answer).join(" ");
  assert.ok(text.includes(BUSINESS_FACTS.legalName));
  assert.ok(text.includes(BUSINESS_FACTS.city));
  assert.ok(text.includes(BUSINESS_FACTS.supportHours));
  assert.match(text, new RegExp(`${CUSTOM_ORDER_LIMITS.maxImages} ${CUSTOM_ORDER_LIMITS.formats}`));
  assert.ok(FACT_FAQS.some((faq) => faq.id === ORDER_TYPES_FAQ_ID));
});

test("describeCatalog only states counts it was given", () => {
  assert.equal(describeCatalog(0, ["A"]), null);
  assert.equal(describeCatalog(Number.NaN, []), null);
  assert.equal(describeCatalog(1, []), "The shop currently lists 1 physical product.");
  assert.equal(
    describeCatalog(102, ["Anime", "Marvel", "Keychains"]),
    "The shop currently lists 102 physical products in 3 categories, including Anime, Marvel and Keychains.",
  );
});

test("homepage FAQ, schema and llms-full share the merged list, and the table sits in its FAQ answer", () => {
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.equal([...home.matchAll(/mergeFactFaqs\(/g)].length, 2, "API result and bundled fallback are both merged");
  assert.match(home, /mainEntity: faqs\.map/);

  const publicFaqs = readFileSync(new URL("../src/lib/public-faqs.ts", import.meta.url), "utf8");
  assert.equal([...publicFaqs.matchAll(/mergeFactFaqs\(/g)].length, 2);

  const faq = readFileSync(new URL("../src/components/home/FAQ.tsx", import.meta.url), "utf8");
  assert.match(faq, /item\.id === ORDER_TYPES_FAQ_ID \? <OrderOptionsTable \/>/);

  const table = readFileSync(new URL("../src/components/home/OrderOptionsTable.tsx", import.meta.url), "utf8");
  assert.match(table, /<table /);
  assert.match(table, /<caption /);
  assert.match(table, /scope="col"/);
  assert.match(table, /ORDER_OPTIONS\.map/);
});

test("landing page cites outside sources and lists its steps and benefits as real lists", () => {
  const reviews = readFileSync(new URL("../src/components/home/Reviews.tsx", import.meta.url), "utf8");
  for (const label of ["3D printing", "glTF"]) {
    assert.ok(EXTERNAL_REFERENCES.some((reference) => reference.label === label));
    assert.match(reviews, new RegExp(`referenceUrl\\("${label}"\\)`));
  }
  assert.match(reviews, /target="_blank" rel="noopener"/);
  assert.match(reviews, /<ul /);

  const custom = readFileSync(new URL("../src/components/home/CustomBuild.tsx", import.meta.url), "utf8");
  assert.match(custom, /<ol /);
  const bulk = readFileSync(new URL("../src/components/home/BulkOrder.tsx", import.meta.url), "utf8");
  assert.match(bulk, /<ul /);
});

test("layout advertises llms-small.txt next to llms.txt", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /url: "\/llms-small\.txt"/);
});
