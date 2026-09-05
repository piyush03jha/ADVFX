import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import sharp from "sharp";
import { promises as fs } from "fs";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  channels: number;
  hasAlpha: boolean;
  space?: string;
  sizeBytes: number;
}

@Injectable()
export class ImageProcessingService {
  /**
   * ============================================================
   * VALIDATE + INSPECT RASTER IMAGE
   * ============================================================
   *
   * Supported raster formats:
   * - PNG
   * - JPG
   * - JPEG
   * - WEBP
   *
   * Sharp also supports additional formats internally, but
   * the application should only call this method for formats
   * explicitly classified as raster images.
   */
  async validateRasterImage(
    absolutePath: string,
  ): Promise<ImageMetadata> {
    let stats;

    /**
     * ----------------------------------------------------------
     * Check file exists
     * ----------------------------------------------------------
     */
    try {
      stats = await fs.stat(absolutePath);
    } catch {
      throw new BadRequestException(
        `Image file does not exist: ${absolutePath}`,
      );
    }

    /**
     * ----------------------------------------------------------
     * Make sure path points to a file
     * ----------------------------------------------------------
     */
    if (!stats.isFile()) {
      throw new BadRequestException(
        "Image path does not point to a file",
      );
    }

    /**
     * ----------------------------------------------------------
     * Reject empty files
     * ----------------------------------------------------------
     */
    if (stats.size === 0) {
      throw new BadRequestException(
        "Image file is empty",
      );
    }

    /**
     * ----------------------------------------------------------
     * Inspect image using Sharp
     * ----------------------------------------------------------
     */
    try {
      const metadata =
        await sharp(absolutePath).metadata();

      /**
       * Width and height are required for a valid
       * raster image.
       */
      if (
        !metadata.width ||
        !metadata.height
      ) {
        throw new Error(
          "Image dimensions could not be determined",
        );
      }

      /**
       * Sharp must be able to identify the format.
       */
      if (!metadata.format) {
        throw new Error(
          "Image format could not be determined",
        );
      }

      return {
        width: metadata.width,

        height: metadata.height,

        format: metadata.format,

        channels:
          metadata.channels ?? 0,

        hasAlpha:
          metadata.hasAlpha ?? false,

        space:
          metadata.space,

        sizeBytes:
          stats.size,
      };
    } catch (error) {
      /**
       * Preserve our own BadRequestException.
       */
      if (
        error instanceof
        BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Invalid image";

      throw new BadRequestException(
        `Invalid image: ${message}`,
      );
    }
  }

  /**
   * ============================================================
   * VALIDATE SVG
   * ============================================================
   *
   * SVG is handled separately because SVG is vector data,
   * not a raster image.
   */
  async validateSvg(
    absolutePath: string,
  ): Promise<{
    format: "svg";
    sizeBytes: number;
  }> {
    let stats;

    /**
     * ----------------------------------------------------------
     * Check file exists
     * ----------------------------------------------------------
     */
    try {
      stats = await fs.stat(absolutePath);
    } catch {
      throw new BadRequestException(
        `SVG file does not exist: ${absolutePath}`,
      );
    }

    /**
     * ----------------------------------------------------------
     * Make sure path points to a file
     * ----------------------------------------------------------
     */
    if (!stats.isFile()) {
      throw new BadRequestException(
        "SVG path does not point to a file",
      );
    }

    /**
     * ----------------------------------------------------------
     * Reject empty files
     * ----------------------------------------------------------
     */
    if (stats.size === 0) {
      throw new BadRequestException(
        "SVG file is empty",
      );
    }

    /**
     * ----------------------------------------------------------
     * Read SVG
     * ----------------------------------------------------------
     */
    let content: string;

    try {
      content =
        await fs.readFile(
          absolutePath,
          "utf8",
        );
    } catch {
      throw new BadRequestException(
        "Unable to read SVG file",
      );
    }

    const trimmed =
      content.trim();

    /**
     * ----------------------------------------------------------
     * Reject completely empty SVG
     * ----------------------------------------------------------
     */
    if (!trimmed) {
      throw new BadRequestException(
        "SVG file is empty",
      );
    }

    /**
     * ----------------------------------------------------------
     * Basic SVG structural validation
     * ----------------------------------------------------------
     *
     * We intentionally do not send SVG through Sharp.
     */
    if (
      !trimmed.includes("<svg") &&
      !trimmed.includes("<SVG")
    ) {
      throw new BadRequestException(
        "Invalid SVG: <svg> element not found",
      );
    }

    return {
      format: "svg",
      sizeBytes: stats.size,
    };
  }
}