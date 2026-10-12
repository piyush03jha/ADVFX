import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

type Params = Record<string, string | string[] | undefined>;
const FILTER_KEYS = ["q", "search", "category", "categories", "sort", "minPrice", "maxPrice", "minRating"];

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
  const canonicalPath = page > 1 ? `${path}?page=${page}` : path;

  return {
    title: page > 1 ? `${title} — Page ${page}` : title,
    description,
    alternates: { canonical: canonicalPath },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: absoluteUrl(canonicalPath) },
  };
}
