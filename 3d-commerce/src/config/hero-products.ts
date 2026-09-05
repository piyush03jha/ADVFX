// src/config/hero-products.ts

export interface HeroProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  model: string;
  category: string;
  metrics: {
    label: string;
    value: string;
  }[];
}

export const heroProducts: HeroProduct[] = [
  {
    id: "product-1",
    name: "Cyber Warrior",
    description:
      "A premium futuristic warrior asset with clean topology, dramatic armor detail, and a presentation-ready silhouette for hero shots.",
    price: 2499,
    model: "/models/products/1.glb",
    category: "Gaming",
    metrics: [
      {
        label: "Rig",
        value: "Animation friendly",
      },
      {
        label: "Formats",
        value: "GLB / OBJ",
      },
      {
        label: "Delivery",
        value: "Instant download",
      },
    ],
  },

  {
    id: "product-2",
    name: "Mecha Guardian",
    description:
      "A heavy mechanical guardian model tuned for premium storefront renders, collector drops, and cinematic close-up presentation.",
    price: 3299,
    model: "/models/products/2.glb",
    category: "Prime",
    metrics: [
      {
        label: "Quality",
        value: "High detail",
      },
      {
        label: "Pipeline",
        value: "Web + DCC ready",
      },
      {
        label: "License",
        value: "Commercial use",
      },
    ],
  },

  {
    id: "product-3",
    name: "Future Racer",
    description:
      "A sleek concept-speed model built for launch banners, product loops, and motion-first e-commerce presentations.",
    price: 1999,
    model: "/models/products/3.glb",
    category: "Mobility",
    metrics: [
      {
        label: "Viewport",
        value: "Realtime smooth",
      },
      {
        label: "Use Case",
        value: "Hero sections",
      },
      {
        label: "Download",
        value: "One-click pack",
      },
    ],
  },

  {
    id: "product-4",
    name: "Nova Sentinel",
    description:
      "A precision-crafted futuristic collectible designed with bold geometry, refined surface details, and a cinematic presentation-ready finish.",
    price: 2899,
    model: "/models/products/4.glb",
    category: "Collectibles",
    metrics: [
      {
        label: "Quality",
        value: "Premium detail",
      },
      {
        label: "Formats",
        value: "GLB / OBJ",
      },
      {
        label: "Delivery",
        value: "Instant download",
      },
    ],
  },
];