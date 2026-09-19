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
    matchTerms: [
      "gaming",
      "game",
      "gamer",
      "console",
      "mecha",
      "character",
      "avatar",
    ],
  },

  {
    id: "anime",
    name: "Anime",
    description: "Anime characters, heroes and collector pieces.",
    image: "/catogeries/3.jpg",
    matchTerms: [
      "anime",
      "manga",
      "hero",
      "character",
      "figure",
      "waifu",
      "otaku",
    ],
  },

  {
    id: "desk-toys",
    name: "Desk Toys",
    description: "Playful companions made for desks and shelves.",
    image: "/catogeries/3.jpg",
    matchTerms: [
      "toy",
      "toys",
      "desk",
      "bot",
      "mini",
      "companion",
      "figurine",
      "kid",
      "kids",
      "child",
      "children",
      "playful",
      "fun",
    ],
  },

  {
    id: "custom",
    name: "Custom",
    description: "Personalized pieces made around your idea.",
    image: "/catogeries/1.jpg",
    matchTerms: [
      "custom",
      "personal",
      "personalized",
      "miniature",
      "made to order",
    ],
  },

  {
    id: "heroes",
    name: "Heroes",
    description: "Bold characters and cinematic display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: [
      "hero",
      "heroes",
      "warrior",
      "guardian",
      "knight",
      "character",
    ],
  },

  {
    id: "props",
    name: "Props",
    description: "Props and world-building display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: [
      "prop",
      "props",
      "weapon",
      "sword",
      "armor",
      "display",
    ],
  },

  {
    id: "kids-toys",
    name: "Kids & Toys",
    description: "Fun, playful models for curious young creators.",
    image: "/catogeries/3.jpg",
    matchTerms: [
      "kids",
      "kid",
      "child",
      "children",
      "toy",
      "toys",
      "play",
      "playful",
      "fun",
    ],
  },

  {
    id: "display",
    name: "Display",
    description:
      "Display-ready physical pieces for shelves and collections.",
    image: "/catogeries/2.jpg",
    matchTerms: [
      "display",
      "shelf",
      "shelves",
      "collectible",
      "collection",
    ],
  },

  {
    id: "collectibles",
    name: "Collectibles",
    description:
      "Collector-focused physical figures and display pieces.",
    image: "/catogeries/2.jpg",
    matchTerms: [
      "collectible",
      "collectibles",
      "collection",
      "collector",
      "figure",
      "figurine",
    ],
  },

  {
    id: "mobile-tv",
    name: "Mobile / TV",
    description: "Media-inspired physical display pieces.",
    image: "/catogeries/3.jpg",
    matchTerms: [
      "mobile",
      "tv",
      "media",
      "movie",
      "series",
    ],
  },
];

/**
 * Normalize a search query.
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

/**
 * Check whether a search term exists in the query.
 *
 * This prevents partial matches such as:
 * "active" matching "tv".
 */
function matchesTerm(query: string, term: string): boolean {
  const normalizedTerm = normalizeQuery(term);

  if (!normalizedTerm) {
    return false;
  }

  const escapedTerm = normalizedTerm.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `(?:^|\\s)${escapedTerm}(?=\\s|$)`,
    "i",
  );

  return pattern.test(query);
}

/**
 * Calculate how strongly a category matches a query.
 */
function getCategoryScore(
  query: string,
  category: ShopCategory,
): number {
  return category.matchTerms.reduce((score, term) => {
    if (!matchesTerm(query, term)) {
      return score;
    }

    let termScore = Math.max(term.length, 3);

    // Give the category name a stronger score when directly searched.
    if (matchesTerm(query, category.name)) {
      termScore += 20;
    }

    return score + termScore;
  }, 0);
}

/**
 * Find the best matching shop category for a search query.
 *
 * Returns null when no category matches.
 */
export function getShopCategoryForQuery(
  query: string,
): ShopCategory | null {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return null;
  }

  let bestCategory: ShopCategory | null = null;
  let bestScore = 0;

  for (const category of shopCategories) {
    const score = getCategoryScore(
      normalizedQuery,
      category,
    );

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Get a category for discovery/search.
 *
 * If no category matches the query, use a default category.
 */
export function getDiscoveryFallbackCategory(
  query: string,
): ShopCategory | null {
  const matchedCategory = getShopCategoryForQuery(query);

  if (matchedCategory) {
    return matchedCategory;
  }

  return (
    shopCategories.find(
      (category) => category.id === "kids-toys",
    ) ??
    shopCategories.find(
      (category) => category.id === "desk-toys",
    ) ??
    null
  );
}

/**
 * Find a shop category by its ID.
 */
export function getShopCategoryById(
  id: string,
): ShopCategory | null {
  const normalizedId = id.trim().toLowerCase();

  if (!normalizedId) {
    return null;
  }

  return (
    shopCategories.find(
      (category) => category.id === normalizedId,
    ) ?? null
  );
}