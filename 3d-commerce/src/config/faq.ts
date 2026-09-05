export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    id: "custom-miniature-time",
    question: "How long does a custom 3D model take?",
    answer:
      "Most custom models are completed within 3–4 weeks, depending on the complexity of the model, the number of reference images, and the level of detail required. We will provide an estimated timeline before work begins.",
  },
  {
    id: "photo-quality",
    question: "What photo quality do you need for customs?",
    answer:
      "Clear, well-lit photos from multiple angles work best. We recommend providing front, side, and rear views wherever possible, along with close-up photos of important details. Higher-quality references generally allow us to create a more accurate model.",
  },
  {
    id: "materials",
    question: "What materials are used?",
    answer:
      "Our digital models are delivered as optimized 3D files, primarily in GLB format for easy viewing and visualization. If you are ordering a physical custom piece, the available material and finishing options will depend on the type of project.",
  },
  {
    id: "returns",
    question: "Do you accept returns or exchanges?",
    answer:
      "Digital 3D models cannot normally be returned once they have been downloaded. For physical products or custom orders, return and exchange eligibility depends on the specific product and its condition. Please review the applicable product terms before ordering.",
  },
  {
    id: "international",
    question: "Is international shipping available?",
    answer:
      "International availability depends on the product and destination. Digital models can be accessed online without physical shipping. For physical custom orders, shipping options and delivery estimates are shown during the ordering process.",
  },
  {
    id: "licensed",
    question: "Are the collectibles officially licensed?",
    answer:
      "Licensing varies by product. Product pages will clearly indicate applicable licensing information where relevant. If you need clarification about a specific model, please contact us before purchasing.",
  },
];