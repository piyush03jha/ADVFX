import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://voxel3d.org").replace(/\/$/, "");
export const SITE_NAME = "Voxel3D";
export const SITE_TAGLINE = "Premium 3D Printed Models & Collectibles";

export const SITE_DESCRIPTION =
  "Shop 3D printed figures, miniatures and collectibles in India. Explore physical models or request a custom piece from your photos.";
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
