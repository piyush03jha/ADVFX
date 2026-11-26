export const THREE_D_CONVERSION_EXTENSIONS = [
  ".abc",
  ".usd",
  ".usda",
  ".usdc",
  ".usdz",
  ".svg",
  ".pdf",
  ".obj",
  ".ply",
  ".stl",
  ".3mf",
  ".bvh",
  ".fbx",
  ".glb",
  ".gltf",
  ".zip",
] as const;

export type ThreeDConversionExtension = (typeof THREE_D_CONVERSION_EXTENSIONS)[number];

export const THREE_D_CONVERSION_EXTENSION_SET = new Set<string>(THREE_D_CONVERSION_EXTENSIONS);


export const conversionPreviewKey = (jobId: string) => `conversions/${jobId}/output/preview.glb`;
export const publishedPreviewKey = (productId: string, jobId: string) => `products/${productId}/models/${jobId}-preview.glb`;
export const LIGHTWEIGHT_MODEL_LABEL = "Lightweight storefront 3D preview";
export const HIGH_DETAIL_MODEL_LABEL = "High-detail 3D model";
