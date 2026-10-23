export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// Public storefront FAQ. Keep answers aligned with the physical-product and
// custom manufacturing workflows; prices and timelines must be confirmed per order.
export const faqItems: FAQItem[] = [
  {
    id: "custom-model-process",
    question: "How do custom 3D printed model orders work?",
    answer:
      "Share clear JPG or PNG reference photos along with your requested dimensions, style and important details. The Voxel3D team reviews your requirements, prepares the model for physical production, confirms the order details with you, and coordinates manufacturing and delivery. Custom uploads are reviewed by our team rather than shown as an instant customer-facing 3D preview.",
  },
  {
    id: "custom-model-timeline",
    question: "How long does a custom 3D printed model take?",
    answer:
      "The timeline depends on model complexity, the quality of the references, dimensions, finishing and production workload. We confirm an estimated timeline for your specific request before production begins.",
  },
  {
    id: "photo-quality",
    question: "What photos should I provide for a custom figure?",
    answer:
      "Provide clear, well-lit JPG or PNG images from multiple angles wherever possible. Front, side and rear views, plus close-ups of distinctive features, help our team understand the shape and details. Include the target dimensions and any important requirements with your submission.",
  },
  {
    id: "physical-products",
    question: "Are Voxel3D products physical items?",
    answer:
      "Yes. Voxel3D sells physical 3D printed models and collectibles. Product pages provide available item details, images and ordering information. We manufacture or arrange production and ship physical orders; we do not sell customer downloads of digital 3D files.",
  },
  {
    id: "materials-and-finish",
    question: "Which material and finish will my model have?",
    answer:
      "Material and finishing options depend on the product and its production requirements. Check the specific product page for listed details. For a custom request, include your preferences so our team can confirm feasible materials and finishing before production.",
  },
  {
    id: "shipping",
    question: "Do you ship physical models across India?",
    answer:
      "Voxel3D's storefront is set up for physical orders shipped across India. Available delivery options and estimated delivery timing depend on the destination and the specific order. Review the shipping information or contact our team if you need clarification before ordering.",
  },
  {
    id: "returns",
    question: "Can I return or exchange a physical model?",
    answer:
      "Return and exchange eligibility depends on the product, its condition and the applicable policy. Review the current Shipping & Returns and Refund Policy pages before placing an order, and contact the team if your order arrives damaged or incorrect.",
  },
  {
    id: "bulk-orders",
    question: "Can I request bulk or business orders?",
    answer:
      "Yes. For a team, event or business order, contact Voxel3D with the model or reference, required quantity, preferred dimensions and target deadline. The team can discuss production feasibility and provide order-specific details.",
  },
];
