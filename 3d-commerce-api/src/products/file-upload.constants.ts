export const SUPPORTED_EXTENSIONS = [
  ".abc",
  ".usd",
  ".svg",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".obj",
  ".ply",
  ".stl",
  ".bvh",
  ".fbx",
  ".glb",
  ".gltf",
] as const;

/**
 * Maximum accepted product-file size in bytes.
 *
 * MAX_UPLOAD_SIZE_MB is the preferred setting. MAX_UPLOAD_SIZE is retained
 * as a compatibility fallback for existing environments.
 */
const MAX_UPLOAD_SIZE_MB = Number(
  process.env.MAX_UPLOAD_SIZE_MB ??
    process.env.MAX_UPLOAD_SIZE ??
    2048,
);

export const MAX_UPLOAD_SIZE_BYTES =
  MAX_UPLOAD_SIZE_MB * 1024 * 1024;
