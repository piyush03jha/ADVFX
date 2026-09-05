import { Injectable, Logger } from "@nestjs/common";
import { ProductFileFormat, ProductFileType } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

@Injectable()
export class ProcessingJobs2DWorker {
  private readonly logger = new Logger(ProcessingJobs2DWorker.name);

  /**
   * Validate supported 2D files.
   *
   * Supported image formats:
   * PNG, JPG, JPEG, WEBP, SVG
   *
   * Supported document format:
   * PDF
   */
  async processFile(productFile: {
    id: string;
    fileType: ProductFileType;
    format: ProductFileFormat;
    storageKey: string;
  }): Promise<void> {
    switch (productFile.fileType) {
      case ProductFileType.IMAGE:
        await this.processImage(productFile);
        return;

      case ProductFileType.DOCUMENT:
        await this.processPdf(productFile);
        return;

      default:
        throw new Error(
          `Unsupported 2D file type: ${productFile.fileType}`,
        );
    }
  }

  private async processImage(productFile: {
    id: string;
    format: ProductFileFormat;
    storageKey: string;
  }): Promise<void> {
    const filePath = this.resolveStoragePath(productFile.storageKey);
    const buffer = await this.readFile(filePath, productFile.id);

    switch (productFile.format) {
      case ProductFileFormat.PNG:
        this.validatePng(buffer);
        break;

      case ProductFileFormat.JPG:
      case ProductFileFormat.JPEG:
        this.validateJpeg(buffer);
        break;

      case ProductFileFormat.WEBP:
        this.validateWebp(buffer);
        break;

      case ProductFileFormat.SVG:
        this.validateSvg(buffer);
        break;

      default:
        throw new Error(
          `Unsupported image format: ${productFile.format}`,
        );
    }

    this.logger.log(
      `Image ${productFile.id} passed validation (${productFile.format})`,
    );
  }

  private async processPdf(productFile: {
    id: string;
    format: ProductFileFormat;
    storageKey: string;
  }): Promise<void> {
    if (productFile.format !== ProductFileFormat.PDF) {
      throw new Error(
        `Unsupported document format: ${productFile.format}`,
      );
    }

    const filePath = this.resolveStoragePath(productFile.storageKey);
    const buffer = await this.readFile(filePath, productFile.id);

    this.validatePdf(buffer);

    this.logger.log(
      `PDF ${productFile.id} passed validation`,
    );
  }

  private async readFile(
    filePath: string,
    fileId: string,
  ): Promise<Buffer> {
    let buffer: Buffer;

    try {
      buffer = await fs.readFile(filePath);
    } catch {
      throw new Error(
        `Unable to read stored file for ${fileId}`,
      );
    }

    if (buffer.length === 0) {
      throw new Error("Stored file is empty");
    }

    return buffer;
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
      throw new Error("Invalid PNG: invalid file signature");
    }
  }

  private validateJpeg(buffer: Buffer): void {
    if (buffer.length < 4) {
      throw new Error("Invalid JPEG: file is too small");
    }

    const validStart =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const validEnd =
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9;

    if (!validStart || !validEnd) {
      throw new Error("Invalid JPEG: invalid file signature");
    }
  }

  private validateWebp(buffer: Buffer): void {
    if (buffer.length < 12) {
      throw new Error("Invalid WEBP: file is too small");
    }

    const riff = buffer.toString("ascii", 0, 4) === "RIFF";
    const webp = buffer.toString("ascii", 8, 12) === "WEBP";

    if (!riff || !webp) {
      throw new Error("Invalid WEBP: invalid RIFF/WEBP signature");
    }
  }

  private validateSvg(buffer: Buffer): void {
    const content = buffer
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .trim();

    if (!content) {
      throw new Error("Invalid SVG: file is empty");
    }

    if (!/<svg(?:\s|>)/i.test(content)) {
      throw new Error("Invalid SVG: <svg> element not found");
    }
  }

  private validatePdf(buffer: Buffer): void {
    if (buffer.length < 5) {
      throw new Error("Invalid PDF: file is too small");
    }

    const header = buffer.toString("ascii", 0, 5);

    if (header !== "%PDF-") {
      throw new Error(`Invalid PDF: invalid header "${header}"`);
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const storageRoot = path.resolve(
      process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage"),
    );

    const resolvedPath = path.resolve(storageRoot, storageKey);

    if (
      resolvedPath !== storageRoot &&
      !resolvedPath.startsWith(`${storageRoot}${path.sep}`)
    ) {
      throw new Error("Invalid storage key");
    }

    return resolvedPath;
  }
}
