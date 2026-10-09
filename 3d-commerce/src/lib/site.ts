import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://voxel3d.org").replace(/\/$/, "");
export const SITE_NAME = "Voxel3D";
export const SITE_TAGLINE = "Premium 3D Printed Models & Collectibles";

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
