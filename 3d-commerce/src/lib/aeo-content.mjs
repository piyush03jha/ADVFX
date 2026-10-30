/**
 * Single source of truth for the plain-text answers that appear on the homepage,
 * in /llms-full.txt and in the HowTo structured data. Keeping them here means the
 * visible text, the schema and the AI-readable files cannot drift apart.
 *
 * Every statement mirrors something already published on the storefront (FAQ,
 * shipping and refund pages, custom-request form). Do not add prices, delivery
 * times, materials or return windows here unless the storefront publishes them.
 */

// Matches the limits shown in the custom request upload form.
export const CUSTOM_ORDER_LIMITS = {
  maxImages: 5,
  totalMegabytes: 50,
  formats: "JPG or PNG",
};

// Publicly stated business details. They mirror the footer and the contact page
// (components/layout/Footer.tsx); update both together.
export const BUSINESS_FACTS = {
  legalName: "Voxel3D Studios Pvt. Ltd.",
  city: "New Delhi, India",
  supportHours: "Monday to Saturday, 10am to 7pm IST",
};

export const PRODUCT_TYPES = [
  "Anime figures",
  "Miniatures",
  "Character models",
  "Collectibles and display pieces for a desk or shelf",
];

export const READY_MADE_ORDER_STEPS = [
  {
    name: "Browse the shop",
    text: "Open the Voxel3D shop and browse physical 3D printed models by category, or search for a figure.",
  },
  {
    name: "Check the product page",
    text: "Each product page shows photos, the available details and the price of that item. Selected products also include an interactive 3D preview.",
  },
  {
    name: "Add to cart and pay online",
    text: "Add the model to your cart, enter your delivery address and pay online. Shipping charges are calculated from the shipping rules and shown before you pay.",
  },
  {
    name: "Track your order",
    text: "Where tracking is available, tracking information is linked to your order after it ships.",
  },
];

export const CUSTOM_ORDER_STEPS = [
  {
    name: "Share your reference",
    text: `Upload up to ${CUSTOM_ORDER_LIMITS.maxImages} clear ${CUSTOM_ORDER_LIMITS.formats} photos (${CUSTOM_ORDER_LIMITS.totalMegabytes} MB in total) from different angles, and tell us the size, style and any important details.`,
  },
  {
    name: "Our team reviews it",
    text: "The Voxel3D team reviews your request, tells you what is possible and confirms the order details with you before production starts.",
  },
  {
    name: "We make the physical model",
    text: "After you confirm, we prepare the model for production and make the physical piece.",
  },
  {
    name: "Receive it in India",
    text: "We arrange delivery of the finished model to your address in India.",
  },
];

export const ORDER_OPTIONS = [
  {
    option: "Ready-made model",
    bestFor: "A figure or collectible that is already in the shop",
    youProvide: "Choose the product and enter your delivery details",
    nextStep: "Pay online; shipping charges are shown before payment",
  },
  {
    option: "Custom 3D printed model",
    bestFor: "A piece you cannot find in the shop",
    youProvide: `Up to ${CUSTOM_ORDER_LIMITS.maxImages} ${CUSTOM_ORDER_LIMITS.formats} photos (${CUSTOM_ORDER_LIMITS.totalMegabytes} MB in total), the size and key details`,
    nextStep: "The team reviews it and confirms the details with you before production",
  },
  {
    option: "Bulk or business order",
    bestFor: "A team, event, shop or business that needs many pieces",
    youProvide: "The model or reference, quantity, size and the date you need it",
    nextStep: "The team discusses feasibility, price and timing with you",
  },
];

export const EXTERNAL_REFERENCES = [
  { label: "3D printing", url: "https://en.wikipedia.org/wiki/3D_printing" },
  { label: "glTF", url: "https://www.khronos.org/gltf/" },
  { label: "Razorpay", url: "https://razorpay.com/" },
];

// First paragraph rendered by the homepage hero. It is the opening answer that
// answer engines read first, so it states what the shop is in one place.
export const HOME_OPENING_ANSWER = `Voxel3D is an online shop in India for physical 3D printed models, anime figures, miniatures and collectibles. Every item is a real printed piece delivered to your home, not a digital file. Browse ready-made models with interactive 3D previews, or send up to ${CUSTOM_ORDER_LIMITS.maxImages} ${CUSTOM_ORDER_LIMITS.formats} photos and your preferred size to request a custom figure that our team reviews before production.`;

// Id of the FAQ answer that also renders the order-type comparison table.
export const ORDER_TYPES_FAQ_ID = "order-types";

/**
 * Factual questions that are always part of the homepage FAQ. The FAQ list itself
 * is editable in the admin (site-content/faq), so these are merged in by id rather
 * than relying on the bundled fallback list: the visible FAQ, the FAQPage schema
 * and /llms-full.txt then all show the same answers. Every number and name comes
 * from CUSTOM_ORDER_LIMITS or BUSINESS_FACTS above, which mirror the storefront.
 */
export const FACT_FAQS = [
  {
    id: "what-is-voxel3d",
    question: "What is Voxel3D?",
    answer: `Voxel3D is an online shop run by ${BUSINESS_FACTS.legalName} in ${BUSINESS_FACTS.city}. It sells physical 3D printed models, anime figures, miniatures and collectibles that are delivered across India, and it makes custom figures from customer photos. It does not sell digital 3D files.`,
  },
  {
    id: "custom-photo-limits",
    question: "How many photos can I upload for a custom model?",
    answer: `You can upload up to ${CUSTOM_ORDER_LIMITS.maxImages} ${CUSTOM_ORDER_LIMITS.formats} photos, ${CUSTOM_ORDER_LIMITS.totalMegabytes} MB in total, together with the size you want and any important details. The team reviews every request and confirms the price and timeline with you before production starts.`,
  },
  {
    id: ORDER_TYPES_FAQ_ID,
    question: "What is the difference between ready-made, custom and bulk orders?",
    answer:
      "A ready-made order is a model that is already in the shop: you pay online and it ships to you. A custom order is a model made from your own photos after the Voxel3D team reviews the request. A bulk or business order is for a team, event or shop that needs many pieces, and the team discusses feasibility, price and timing with you.",
  },
  {
    id: "support-hours",
    question: "When can I contact the Voxel3D team?",
    answer: `The Voxel3D team is available ${BUSINESS_FACTS.supportHours}. You can reach it through the contact page, by email or on WhatsApp for product questions, order status, custom requests and bulk orders.`,
  },
];

/** Appends FACT_FAQS to a FAQ list, skipping any whose id or question is already there. */
export function mergeFactFaqs(items) {
  const list = Array.isArray(items) ? items : [];
  const seenIds = new Set(list.map((item) => item.id));
  const seenQuestions = new Set(list.map((item) => String(item.question).trim().toLowerCase()));
  return [
    ...list,
    ...FACT_FAQS.filter(
      (fact) => !seenIds.has(fact.id) && !seenQuestions.has(fact.question.toLowerCase()),
    ),
  ];
}

/**
 * One sentence of live catalog facts (counts and category names come from the same
 * API data that renders the product sections), or null when nothing is listed.
 */
export function describeCatalog(productCount, categoryNames = []) {
  if (!Number.isFinite(productCount) || productCount <= 0) return null;

  const products = `${productCount} physical ${productCount === 1 ? "product" : "products"}`;
  if (categoryNames.length === 0) return `The shop currently lists ${products}.`;

  const shown = categoryNames.slice(0, 4);
  const categories = `${categoryNames.length} ${categoryNames.length === 1 ? "category" : "categories"}`;
  const names =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;

  return `The shop currently lists ${products} in ${categories}, including ${names}.`;
}
