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
