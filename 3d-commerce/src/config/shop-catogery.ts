export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  image: string;
}

export const shopCategories: ShopCategory[] = [
  {
    id: "custom-miniatures",
    name: "Custom Miniatures",
    slug: "custom-miniatures",
    itemCount: 128,
    image: "catogeries/1.jpg",
  },
  {
    id: "anime",
    name: "Anime",
    slug: "anime",
    itemCount: 96,
    image: "catogeries/2.jpg",
  },
  {
    id: "gaming",
    name: "Gaming",
    slug: "gaming",
    itemCount: 142,
    image: "catogeries/4.jpg",
  },
  {
    id: "heroes",
    name: "Heroes",
    slug: "heroes",
    itemCount: 86,
    image: "catogeries/1.jpg",
  },
  {
    id: "desk-toys",
    name: "Desk Toys",
    slug: "desk-toys",
    itemCount: 63,
    image: "catogeries/3.jpg",
  },
  {
    id: "weapon-props",
    name: "Weapon Props",
    slug: "weapon-props",
    itemCount: 91,
    image: "catogeries/4.jpg",
  },
];
