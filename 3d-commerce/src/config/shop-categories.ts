export interface ShopCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  matchTerms: string[  {
    id: "display",
    name: "Display",
    description: "Display-ready physical pieces for shelves and collections.",
    image: "/catogeries/2.jpg",
    matchTerms: ["display", "shelf", "shelves", "collectible", "collection"],
  },
  {
    id: "collectibles",
    name: "Collectibles",
    description: "Collector-focused physical figures and display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: ["collectible", "collectibles", "collection", "collector", "figure", "figurine"],
  },
  {
    id: "mobile-tv",
    name: "Mobile / TV",
    description: "Media-inspired physical display pieces.",
    image: "/catogeries/3.jpg",
    matchTerms: ["mobile", "tv", "media", "movie", "series"],
  },
];
}

export const shopCategories: ShopCategory[] = [
  {
    id: "gaming",
    name: "Gaming",
    description: "Characters, mecha and game-inspired pieces.",
    image: "/catogeries/4.jpg",
    matchTerms: ["gaming", "game", "gamer", "console", "mecha", "character", "avatar"],
  },
  {
    id: "anime",
    name: "Anime",
    description: "Anime characters, heroes and collector pieces.",
    image: "/catogeries/3.jpg",
    matchTerms: ["anime", "manga", "hero", "character", "figure", "waifu", "otaku"],
  },
  {
    id: "desk-toys",
    name: "Desk Toys",
    description: "Playful companions made for desks and shelves.",
    image: "/catogeries/3.jpg",
    matchTerms: ["toy", "toys", "desk", "bot", "mini", "companion", "figurine", "kid", "kids", "child", "children", "playful", "fun"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Personalized pieces made around your idea.",
    image: "/catogeries/1.jpg",
    matchTerms: ["custom", "personal", "personalized", "miniature", "made to order"],
  },
  {
    id: "heroes",
    name: "Heroes",
    description: "Bold characters and cinematic display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: ["hero", "heroes", "warrior", "guardian", "knight", "character"],
  },
  {
    id: "props",
    name: "Props",
    description: "Props and world-building display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: ["prop", "props", "weapon", "sword", "armor", "display"],
  },
  {
    id: "kids-toys",
    name: "Kids & Toys",
    description: "Fun, playful models for curious young creators.",
    image: "/catogeries/3.jpg",
    matchTerms: ["kids", "kid", "child", "children", "toy", "toys", "play", "playful", "fun"],
  },
];

export function getShopCategoryForQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const categoryScores = shopCategories.map((category) => ({
    category,
    score: category.matchTerms.reduce((score, term) => {
      return normalized.includes(term) ? score + Math.max(term.length, 3) : score;
    }, 0),
  }));

  const best = categoryScores.sort((a, b) => b.score - a.score)[0];
  return best?.score ? best.category : null;
}

export function getDiscoveryFallbackCategory(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return (
    getShopCategoryForQuery(normalized) ??
    shopCategories.find((category) => category.id === "kids-toys") ??
    shopCategories.find((category) => category.id === "desk-toys") ??
    null
  );
}
