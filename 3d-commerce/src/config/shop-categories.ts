export interface ShopCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  matchTerms: string[];
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
    id: "display",
    name: "Display",
    description: "Statement pieces made to stand out on a shelf.",
    image: "/catogeries/1.jpg",
    matchTerms: ["display", "shelf", "showpiece", "decor", "collectible", "collection"],
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
    shopCategories.find((category) => category.id === "desk-toys") ??
    null
  );
}
