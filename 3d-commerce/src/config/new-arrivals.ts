export interface NewArrivalProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  model: string;
  rating?: number;
  reviewCount?: number;
}

export const newArrivals: NewArrivalProduct[] = [
  {
    id: "kuro-neko",
    name: "Kuro Neko — Black Cat Oracle",
    category: "Collectibles",
    price: 3299,
    image: "catogeries/1.jpg",
    model: "/models/products/1.glb",
  },

  {
    id: "memento-mori",
    name: "Memento Mori — Crimson Skull",
    category: "Collectibles",
    price: 1999,
    image: "catogeries/2.jpg",
    model: "/models/products/2.glb",
  },

  {
    id: "sakura-ronin",
    name: "Sakura Ronin",
    category: "Anime",
    price: 3499,
    image: "catogeries/3.jpg",
    model: "/models/products/3.glb",
  },
];

export const bestSellers: NewArrivalProduct[] = [
  {
    id: "shadow-oni",
    name: "Shadow Oni Warrior",
    category: "Gaming",
    price: 4999,
    rating: 4.9,
    reviewCount: 218,
    image: "catogeries/4.jpg",
    model: "/models/products/4.glb",
  },

  {
    id: "kaito-blue",
    name: "Kaito — Blue Horizon",
    category: "Gaming",
    price: 3799,
    rating: 4.7,
    reviewCount: 127,
    image: "catogeries/3.jpg",
    model: "/models/products/3.glb",
  },
];