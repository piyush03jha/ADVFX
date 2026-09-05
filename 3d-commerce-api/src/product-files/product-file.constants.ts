import { ProductFileFormat, ProductFileType } from "@prisma/client";

/**
 * Supported upload formats for the product asset system.
 *
 * 3D:
 * .abc .usd .obj .ply .stl .bvh .fbx .glb .gltf
 *
 * 2D:
 * .png .jpg .jpeg .webp .svg
 *
 * Document:
 * .pdf
 */
export const SUPPORTED_EXTENSIONS = {
  // 3D
  ".abc": ProductFileFormat.ABC,
  ".usd": ProductFileFormat.USD,
  ".obj": ProductFileFormat.OBJ,
  ".ply": ProductFileFormat.PLY,
  ".stl": ProductFileFormat.STL,
  ".bvh": ProductFileFormat.BVH,
  ".fbx": ProductFileFormat.FBX,
  ".glb": ProductFileFormat.GLB,
  ".gltf": ProductFileFormat.GLTF,

  // 2D
  ".png": ProductFileFormat.PNG,
  ".jpg": ProductFileFormat.JPG,
  ".jpeg": ProductFileFormat.JPEG,
  ".webp": ProductFileFormat.WEBP,
  ".svg": ProductFileFormat.SVG,

  // Document
  ".pdf": ProductFileFormat.PDF,
} as const;

export const MODEL_FORMATS = new Set<ProductFileFormat>([
  ProductFileFormat.ABC,
  ProductFileFormat.USD,
  ProductFileFormat.OBJ,
  ProductFileFormat.PLY,
  ProductFileFormat.STL,
  ProductFileFormat.BVH,
  ProductFileFormat.FBX,
  ProductFileFormat.GLB,
  ProductFileFormat.GLTF,
]);

export const IMAGE_FORMATS = new Set<ProductFileFormat>([
  ProductFileFormat.PNG,
  ProductFileFormat.JPG,
  ProductFileFormat.JPEG,
  ProductFileFormat.WEBP,
  ProductFileFormat.SVG,
]);

export const DOCUMENT_FORMATS = new Set<ProductFileFormat>([
  ProductFileFormat.PDF,
]);

/**
 * Single source of truth for upload limits.
 */
export const MAX_UPLOAD_SIZE_MB = Number(
  process.env.MAX_UPLOAD_SIZE_MB ?? 100,
);

if (
  !Number.isFinite(MAX_UPLOAD_SIZE_MB) ||
  MAX_UPLOAD_SIZE_MB <= 0 ||
  MAX_UPLOAD_SIZE_MB > 1024
) {
  throw new Error(
    "MAX_UPLOAD_SIZE_MB must be a positive value up to 1024 MB",
  );
}

export const MAX_UPLOAD_SIZE_BYTES =
  MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export function getProductFileType(
  format: ProductFileFormat,
): ProductFileType {
  if (MODEL_FORMATS.has(format)) {
    return ProductFileType.MODEL;
  }

  if (IMAGE_FORMATS.has(format)) {
    return ProductFileType.IMAGE;
  }

  if (DOCUMENT_FORMATS.has(format)) {
    return ProductFileType.DOCUMENT;
  }

  throw new Error(`Unsupported product file format: ${format}`);
}