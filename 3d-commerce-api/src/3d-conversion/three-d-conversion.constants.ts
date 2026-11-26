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

