import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

type Params = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "q",
  "search",
  "category",
  "categories",
  "sort",
  "minPrice",
  "maxPrice",
  "minRating",
] as const;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasNonEmptyParam(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.some((item) => item.trim().length > 0) : Boolean(value?.trim());
}

export function shopListingMetadata(opts: {
  path: string;
  title: string;
  description: string;
  searchParams: Params;
}): Metadata {
  const { path, title, description, searchParams } = opts;
  const filtered = FILTER_KEYS.some((key) => hasNonEmptyParam(searchParams[key]));
  const rawPage = firstParam(searchParams.page);
  const parsedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 1 ? parsedPage : 1;

  // Faceted/search URLs should not compete with the clean landing page.
  // Paginated listings keep their own canonical URL so products remain discoverable.
  const canonicalPath = page > 1 ? `${path}?page=${page}` : path;

  return {
    title: page > 1 ? `${title} — Page ${page}` : title,
    description,
    alternates: { canonical: canonicalPath },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      title: page > 1 ? `${title} — Page ${page}` : title,
      description,
      url: absoluteUrl(canonicalPath),
    },
  };
}
