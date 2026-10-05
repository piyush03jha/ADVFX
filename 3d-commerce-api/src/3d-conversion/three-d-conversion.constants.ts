export const THREE_D_CONVERSION_EXTENSIONS = [
  ".abc", ".usd", ".usda", ".usdc", ".usdz", ".fbx", ".obj", ".ply", ".stl", ".gltf",
] as const;

export type ThreeDConversionExtension = (typeof THREE_D_CONVERSION_EXTENSIONS)[number];

export const THREE_D_CONVERSION_EXTENSION_SET = new Set<string>(THREE_D_CONVERSION_EXTENSIONS);
export const THREE_D_CONVERSION_MAX_BYTES =
  Number(process.env.CONVERSION_MAX_UPLOAD_MB ?? 250) * 1024 * 1024;
