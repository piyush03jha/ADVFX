import { IconHeart, IconUser, IconUsers } from "@tabler/icons-react";

export const bodyOptions = [
  { id: "half", label: "Half body", description: "Waist-up or seated composition.", basePrice: 2499, priceLabel: "From ₹2,499", image: "/catogeries/1.jpg" },
  { id: "full", label: "Full body", description: "Complete figure from head to feet.", basePrice: 3499, priceLabel: "From ₹3,499", image: "/catogeries/2.jpg" },
];

export const headOptions = [
  { id: "bobble", label: "Bobble head", description: "Oversized head with a playful collectible feel.", addPrice: 500, priceLabel: "+₹500", image: "/catogeries/3.jpg" },
  { id: "stationary", label: "Stationary head", description: "Classic proportions with a natural head shape.", addPrice: 0, priceLabel: "Included", image: "/catogeries/4.jpg" },
];

export const frameOptions = [
  { id: "single", label: "Just me", description: "One person as the main subject.", addPrice: 0, priceLabel: "Included", icon: IconUser },
  { id: "couple", label: "Me + partner", description: "Two people together in one display.", addPrice: 1800, priceLabel: "+₹1,800", icon: IconUsers },
  { id: "pet", label: "Me + pet", description: "Add one beloved pet to the piece.", addPrice: 1200, priceLabel: "+₹1,200", icon: IconHeart },
  { id: "group", label: "Family / group", description: "Three or more people in one scene.", addPrice: 3200, priceLabel: "+₹3,200", icon: IconUsers },
];

export const sizeOptions = [
  { value: "8", label: "8 cm", multiplier: 0.75 },
  { value: "12", label: "12 cm", multiplier: 0.9 },
  { value: "15", label: "15 cm", multiplier: 1 },
  { value: "20", label: "20 cm", multiplier: 1.35 },
  { value: "25", label: "25 cm", multiplier: 1.75 },
  { value: "30", label: "30 cm", multiplier: 2.15 },
];

export const processSteps = [
  { title: "We review", description: "Your references and selected build." },
  { title: "We prepare", description: "The 3D model for production." },
  { title: "You approve", description: "Review the final design before making." },
  { title: "We make it", description: "Production, finishing and delivery." },
];

export function calculatePrice({
  body,
  head,
  frame,
  size,
}: {
  body: { basePrice: number };
  head: { addPrice: number };
  frame: { addPrice: number };
  size: { multiplier: number };
}) {
  return Math.round((body.basePrice + head.addPrice + frame.addPrice) * size.multiplier);
}
