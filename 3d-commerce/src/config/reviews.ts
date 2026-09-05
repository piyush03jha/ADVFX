export interface Review {
  id: string;
  initials: string;
  name: string;
  location: string;
  date: string;
  rating: number;
  text: string;
  product: string;
}

export const reviews: Review[] = [
  {
    id: "arjun-sharma",
    initials: "AS",
    name: "Arjun Sharma",
    location: "Mumbai",
    date: "12 Jan 2025",
    rating: 5,
    text:
      "Absolutely museum-quality. The detail on the armor is indescribable — I've been collecting for 14 years and this is the finest piece I own. Worth every rupee and then some.",
    product: "Shadow Oni Warrior",
  },
  {
    id: "priya-menon",
    initials: "PM",
    name: "Priya Menon",
    location: "Bengaluru",
    date: "8 Feb 2025",
    rating: 5,
    text:
      "Got a custom miniature made for my husband's birthday. They captured his likeness perfectly — down to the tiny scar on his chin. He was speechless.",
    product: "Custom Personal Miniature",
  },
  {
    id: "rohan-desai",
    initials: "RD",
    name: "Rohan Desai",
    location: "Pune",
    date: "3 Mar 2025",
    rating: 5,
    text:
      "The packaging alone deserves a review. Cherry wood presentation box, tissue paper, white gloves included. The figure itself is breathtaking.",
    product: "Valkyrie — Battle Throne",
  },
  {
    id: "kavya-nair",
    initials: "KN",
    name: "Kavya Nair",
    location: "Chennai",
    date: "19 Mar 2025",
    rating: 5,
    text:
      "Those blue eyes — genuinely uncanny. My cat keeps pawing at it. The cold-cast porcelain has incredible depth that photos simply don't capture.",
    product: "Kuro Neko — Black Cat Oracle",
  },
];