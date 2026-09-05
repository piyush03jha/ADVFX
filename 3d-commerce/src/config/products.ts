export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;

  price: number;
  oldPrice?: number;

  rating: number;
  reviewCount: number;

  image: string;
  model: string;

  format: string;
  fileSize: string;
  polygonCount: string;
  textureResolution?: string;

  badge?: string;
  discount?: string;

  tags?: string[];
}

export const products: Product[] = [
  {
    id: "1",
    name: "Cyberpunk Warrior",
    category: "Gaming",

    description:
      "A highly detailed cyberpunk warrior model designed for games, cinematic scenes, visualization, and real-time 3D projects.",

    price: 1499,
    oldPrice: 1999,

    rating: 4.8,
    reviewCount: 127,

    image: "/models/products/1.jpg",
    model: "/models/products/1.glb",

    format: "GLB",
    fileSize: "18 MB",
    polygonCount: "42K",
    textureResolution: "4K",

    badge: "Bestseller",
    discount: "25% OFF",

    tags: [
      "Cyberpunk",
      "Character",
      "Gaming",
      "Sci-Fi",
    ],
  },

  {
    id: "2",
    name: "Futuristic Sports Car",
    category: "Vehicles",

    description:
      "A premium futuristic sports car model with detailed geometry and materials, suitable for games, product visualization, and cinematic environments.",

    price: 1299,
    oldPrice: 1699,

    rating: 4.7,
    reviewCount: 892,

    image: "/models/products/2.jpg",
    model: "/models/products/2.glb",

    format: "GLB",
    fileSize: "24 MB",
    polygonCount: "58K",
    textureResolution: "4K",

    badge: "Popular",
    discount: "24% OFF",

    tags: [
      "Car",
      "Vehicle",
      "Sci-Fi",
      "Gaming",
    ],
  },

  {
    id: "3",
    name: "Anime Warrior",
    category: "Anime",

    description:
      "A stylized anime-inspired warrior model created for games, animation, character visualization, and personal 3D projects.",

    price: 999,
    oldPrice: 1299,

    rating: 4.9,
    reviewCount: 234,

    image: "/models/products/3.jpg",
    model: "/models/products/3.glb",

    format: "GLB",
    fileSize: "16 MB",
    polygonCount: "36K",
    textureResolution: "4K",

    badge: "Trending",
    discount: "23% OFF",

    tags: [
      "Anime",
      "Character",
      "Warrior",
      "Stylized",
    ],
  },

  {
    id: "4",
    name: "Fantasy Castle",
    category: "Architecture",

    description:
      "A detailed fantasy castle environment designed for games, cinematic scenes, architectural visualization, and immersive 3D experiences.",

    price: 1799,
    oldPrice: 2299,

    rating: 4.7,
    reviewCount: 156,

    image: "/models/products/4.jpg",
    model: "/models/products/4.glb",

    format: "GLB",
    fileSize: "32 MB",
    polygonCount: "74K",
    textureResolution: "4K",

    badge: "New",
    discount: "22% OFF",

    tags: [
      "Castle",
      "Fantasy",
      "Architecture",
      "Environment",
    ],
  },

  {
    id: "5",
    name: "Modern Interior",
    category: "Interior",

    description:
      "A modern interior environment with detailed furniture, materials, and lighting-ready geometry for visualization and real-time applications.",

    price: 1199,

    rating: 4.5,
    reviewCount: 98,

    image: "/models/products/1.jpg",
    model: "/models/products/1.glb",

    format: "GLB",
    fileSize: "21 MB",
    polygonCount: "49K",
    textureResolution: "4K",

    tags: [
      "Interior",
      "Architecture",
      "Furniture",
      "Modern",
    ],
  },

  {
    id: "6",
    name: "Sci-Fi Robot",
    category: "Gaming",

    description:
      "A detailed sci-fi robot character optimized for interactive applications, games, animation, and cinematic visualization.",

    price: 1399,
    oldPrice: 1799,

    rating: 4.9,
    reviewCount: 312,

    image: "/models/products/2.webp",
    model: "/models/products/2.glb",

    format: "GLB",
    fileSize: "20 MB",
    polygonCount: "47K",
    textureResolution: "4K",

    badge: "Featured",
    discount: "22% OFF",

    tags: [
      "Robot",
      "Sci-Fi",
      "Gaming",
      "Character",
    ],
  },
];

/* =====================================================
   HELPERS
===================================================== */

/**
 * Find a single product by its ID.
 */
export function getProductById(
  id: string,
): Product | undefined {
  return products.find(
    (product) => product.id === id,
  );
}

/**
 * Get products belonging to a category.
 */
export function getProductsByCategory(
  category: string,
): Product[] {
  return products.filter(
    (product) =>
      product.category.toLowerCase() ===
      category.toLowerCase(),
  );
}

/**
 * Get related products.
 *
 * Excludes the current product and prioritizes
 * products from the same category.
 */
export function getRelatedProducts(
  product: Product,
  limit = 4,
): Product[] {
  const sameCategory = products.filter(
    (item) =>
      item.id !== product.id &&
      item.category === product.category,
  );

  const otherProducts = products.filter(
    (item) =>
      item.id !== product.id &&
      item.category !== product.category,
  );

  return [
    ...sameCategory,
    ...otherProducts,
  ].slice(0, limit);
}