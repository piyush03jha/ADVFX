import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://voxel3d.org").replace(/\/$/, "");
export const SITE_NAME = "Voxel3D";
export const SITE_TAGLINE = "Premium 3D Printed Models & Collectibles";

export const SITE_DESCRIPTION =
  "Shop premium 3D printed models, collectibles and custom builds from Voxel3D. Made to order and shipped across India.";
export const SITE_LOGO_PATH = "/logo/full_logo.png";

/** Optional social profile URLs (comma-separated env var) used as Organization `sameAs`. */
export const SITE_SAME_AS = (process.env.NEXT_PUBLIC_SOCIAL_LINKS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => /^https?:\/\//.test(value));

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
