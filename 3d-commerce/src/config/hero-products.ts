export interface HeroProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  model: string;
  category: string;
  metrics: {
    label: string;
    value: string;
  }[];
}

/**
 * Hero products are now loaded from the backend catalog.
 *
 * This file intentionally contains only the shared response shape so the
 * existing hero presentation remains strongly typed without owning catalog
 * data in the frontend.
 */
