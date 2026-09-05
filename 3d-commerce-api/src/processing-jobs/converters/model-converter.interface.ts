import { ProductFileFormat } from "@prisma/client";

export interface ModelConversionResult {
  outputPath: string;
  outputFormat: "GLB";
  outputMimeType: string;
  outputExtension: ".glb";
  fileSize: number;
}

export interface ModelConverter {
  supports(format: ProductFileFormat): boolean;

  convert(
    inputPath: string,
    outputPath: string,
  ): Promise<ModelConversionResult>;
}