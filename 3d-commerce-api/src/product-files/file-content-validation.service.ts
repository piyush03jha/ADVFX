import { BadRequestException, Injectable } from "@nestjs/common";
import { ProductFileFormat } from "@prisma/client";
import sharp from "sharp";

@Injectable()
export class FileContentValidationService {
  /**
   * Validate file bytes against the declared product-file format.
   *
   * MIME type is treated only as a client hint. In particular,
   * browsers and curl may report valid assets as application/octet-stream.
   * The actual bytes are therefore validated here.
   *
   * Formats without a reliable lightweight signature are intentionally
   * left to their format-specific processing adapter/worker.
   */
  async validate(
    format: ProductFileFormat,
    buffer: Buffer,
  ): Promise<void> {
    if (!buffer.length) {
      throw new BadRequestException("Uploaded file is empty");
    }

    switch (format) {
      case ProductFileFormat.PNG:
        this.validatePng(buffer);
        return;

      case ProductFileFormat.JPG:
      case ProductFileFormat.JPEG:
        this.validateJpeg(buffer);
        return;

      case ProductFileFormat.WEBP:
        await this.validateWebp(buffer);
        return;

      case ProductFileFormat.SVG:
        this.validateSvg(buffer);
        return;

      case ProductFileFormat.PDF:
        this.validatePdf(buffer);
        return;

      case ProductFileFormat.GLB:
        this.validateGlb(buffer);
        return;

      case ProductFileFormat.GLTF:
        this.validateGltf(buffer);
        return;

      default:
        // ABC, USD, OBJ, PLY, STL, BVH and FBX need dedicated
        // format-specific parsers. Their extension/type validation
        // remains in the upload layer and their structural validation
        // belongs in the processing pipeline.
        return;
    }
  }

  private validatePng(buffer: Buffer): void {
    const signature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    if (
      buffer.length < signature.length ||
      !buffer.subarray(0, signature.length).equals(signature)
    ) {
      throw new BadRequestException("Invalid PNG: invalid file signature");
    }
  }

  private validateJpeg(buffer: Buffer): void {
    if (buffer.length < 4) {
      throw new BadRequestException("Invalid JPEG: file is too small");
    }

    const validStart =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const validEnd =
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9;

    if (!validStart || !validEnd) {
      throw new BadRequestException("Invalid JPEG: invalid file signature");
    }
  }

  private async validateWebp(buffer: Buffer): Promise<void> {
    if (buffer.length < 12) {
      throw new BadRequestException("Invalid WEBP: file is too small");
    }

    const riff = buffer.toString("ascii", 0, 4) === "RIFF";
    const webp = buffer.toString("ascii", 8, 12) === "WEBP";

    if (!riff || !webp) {
      throw new BadRequestException(
        "Invalid WEBP: invalid RIFF/WEBP signature",
      );
    }

    try {
      const metadata = await sharp(buffer).metadata();

      if (
        metadata.format !== "webp" ||
        !metadata.width ||
        !metadata.height
      ) {
        throw new Error("WEBP image metadata is invalid");
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "invalid image data";

      throw new BadRequestException(`Invalid WEBP: ${message}`);
    }
  }

  private validateSvg(buffer: Buffer): void {
    const content = buffer
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .trim();

    if (!content) {
      throw new BadRequestException("Invalid SVG: file is empty");
    }

    if (content.includes("\u0000")) {
      throw new BadRequestException("Invalid SVG: binary data detected");
    }

    if (!/<svg(?:\s|>)/i.test(content)) {
      throw new BadRequestException("Invalid SVG: <svg> element not found");
    }
  }

  private validatePdf(buffer: Buffer): void {
    if (buffer.length < 5) {
      throw new BadRequestException("Invalid PDF: file is too small");
    }

    if (buffer.toString("ascii", 0, 5) !== "%PDF-") {
      throw new BadRequestException("Invalid PDF: invalid header");
    }

    // A PDF normally ends with %%EOF. Allow trailing whitespace because
    // valid producers may append whitespace after the marker.
    const tail = buffer
      .subarray(Math.max(0, buffer.length - 1024))
      .toString("latin1")
      .trimEnd();

    if (!tail.endsWith("%%EOF")) {
      throw new BadRequestException("Invalid PDF: EOF marker not found");
    }
  }

  private validateGlb(buffer: Buffer): void {
    if (buffer.length < 12) {
      throw new BadRequestException("Invalid GLB: file is too small");
    }

    if (buffer.toString("ascii", 0, 4) !== "glTF") {
      throw new BadRequestException("Invalid GLB: invalid magic");
    }

    const version = buffer.readUInt32LE(4);
    if (version !== 2) {
      throw new BadRequestException(
        `Invalid GLB: unsupported version ${version}`,
      );
    }

    const declaredLength = buffer.readUInt32LE(8);
    if (declaredLength !== buffer.length) {
      throw new BadRequestException(
        `Invalid GLB: declared length ${declaredLength} does not match actual length ${buffer.length}`,
      );
    }
  }

  private validateGltf(buffer: Buffer): void {
    let document: unknown;

    try {
      document = JSON.parse(buffer.toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid glTF: file is not valid JSON");
    }

    if (
      typeof document !== "object" ||
      document === null ||
      Array.isArray(document)
    ) {
      throw new BadRequestException("Invalid glTF: root must be a JSON object");
    }

    const asset = (document as { asset?: unknown }).asset;

    if (
      typeof asset !== "object" ||
      asset === null ||
      Array.isArray(asset) ||
      typeof (asset as { version?: unknown }).version !== "string"
    ) {
      throw new BadRequestException("Invalid glTF: asset.version is required");
    }

    const version = (asset as { version: string }).version;
    if (!version.startsWith("2.")) {
      throw new BadRequestException(
        `Invalid glTF: unsupported asset version ${version}`,
      );
    }
  }
}
