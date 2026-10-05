import type { Metadata } from "next";

type Params = Record<string, string | string[] | undefined>;

const FILTER_KEYS = ["q", "search", "category", "sort", "minPrice", "maxPrice", "minRating"];

export function shopListingMetadata(opts: {
  path: string;
  title: string;
  description: string;
  searchParams: Params;
}): Metadata {
  const { path, title, description, searchParams } = opts;
  const filtered = FILTER_KEYS.some((key) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsedPage = Number(rawPage);
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;

  return {
    title: page > 1 ? `${title} — Page ${page}` : title,
    description,
    alternates: { canonical: page > 1 ? `${path}?page=${page}` : path },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: page > 1 ? `${path}?page=${page}` : path },
  };
}