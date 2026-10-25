import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://voxel3d.org").replace(/\/$/, "");
export const SITE_NAME = "Voxel3D";
export const SITE_TAGLINE = "Premium 3D Printed Models & Collectibles";

export const SITE_DESCRIPTION =
  "Shop 3D printed figures, miniatures and collectibles in India. Explore physical models or request a custom piece from your photos.";
export const HOME_H1 = "Buy 3D Printed Models, Anime Figures & Collectibles in India";
export const HOME_TITLE = "Buy 3D Printed Models & Collectibles in India | Voxel3D";
export const HOME_DESCRIPTION =
  "Buy physical 3D printed models, anime figures, miniatures and collectibles in India. Order ready-made pieces or a custom figure made from your photos.";
// Date the storefront first went public. Used in schema and meta tags.
export const SITE_PUBLISHED_ISO = "2026-09-01T00:00:00+05:30";
export const SITE_LOGO_PATH = "/logo/full_logo.png";

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/hello.voxel3d6/",
  youtube: "https://www.youtube.com/@hello.voxel3d",
} as const;

/**
 * Social profile URLs used as Organization `sameAs`. Extra profiles can be added
 * through the optional NEXT_PUBLIC_SOCIAL_LINKS env var (comma-separated).
 */
export const SITE_SAME_AS = Array.from(
  new Set([
    ...Object.values(SOCIAL_LINKS),
    ...(process.env.NEXT_PUBLIC_SOCIAL_LINKS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//.test(value)),
  ]),
);

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
