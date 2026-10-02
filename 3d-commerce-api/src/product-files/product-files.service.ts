import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { extname, posix } from "node:path";
import { randomUUID } from "node:crypto";
import { ProductFileFormat } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ProcessingJobsService } from "../processing-jobs/processing-jobs.service";
import { StorageService } from "../storage/storage.service";

import {
  DOCUMENT_FORMATS,
  IMAGE_FORMATS,
  MAX_UPLOAD_SIZE_BYTES,
  MODEL_FORMATS,
  SUPPORTED_EXTENSIONS,
  getProductFileType,
} from "./product-file.constants";
import { FileContentValidationService } from "./file-content-validation.service";

interface UploadedProductFile {
  originalname: string;
  mimetype?: string | null;
  size: number;
  buffer: Buffer;
}

interface PreparedUploadFile {
  originalName: string;
  format: ProductFileFormat | null;
  fileType: ReturnType<typeof getProductFileType> | null;
  mimeType: string;
}

@Injectable()
export class ProductFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processingJobs: ProcessingJobsService,
    private readonly contentValidator: FileContentValidationService,
  ) {}

  /**
   * ============================================================
   * SINGLE FILE UPLOAD
   * ============================================================
   */

  async upload(
    productId: string,
    file: UploadedProductFile,
  ) {
    await this.ensureProductExists(productId);

    const prepared = await this.validateUploadedFile(file);

    if (!prepared.format) {
      throw new BadRequestException(
        "Unable to determine product file format",
      );
    }

    if (!prepared.fileType) {
      throw new BadRequestException(
        "Unable to determine product file type",
      );
    }

    const stored = await this.storage.saveProductFile({
      productId,
      filename: file.originalname,
      buffer: file.buffer,
    });

    let createdFileId: string | null = null;

    try {
      const created =
        await this.prisma.productFile.create({
          data: {
            productId,
            originalName: prepared.originalName,
            storageKey: stored.storageKey,
            storageUrl: stored.storageUrl,
            format: prepared.format,
            fileType: prepared.fileType,
            mimeType: prepared.mimeType,
            fileSize: BigInt(file.buffer.length),
            processingStatus: "PENDING",
          },
        });

      createdFileId = created.id;

      await this.processingJobs.create(
        created.id,
      );

      return this.serializeFile(created);
    } catch (error) {
      if (createdFileId) {
        try {
          await this.prisma.productFile.delete({
            where: {
              id: createdFileId,
            },
          });
        } catch {
          // Preserve original error.
        }
      }

      try {
        await this.storage.delete(
          stored.storageKey,
        );
      } catch {
        // Preserve original error.
      }

      throw error;
    }
  }

  async findAll(
    productId: string,
  ) {
    await this.ensureProductExists(
      productId,
    );

    const files =
      await this.prisma.productFile.findMany(
        {
          where: {
            productId,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      );

    return files.map((file) =>
      this.serializeFile(file),
    );
  }

  async findOne(
    productId: string,
    fileId: string,
  ) {
    const file =
      await this.prisma.productFile.findFirst(
        {
          where: {
            id: fileId,
            productId,
          },
        },
      );

    if (!file) {
      throw new NotFoundException(
        `Product file "${fileId}" not found`,
      );
    }

    return this.serializeFile(
      file,
    );
  }

  /**
   * ============================================================
   * DELETE FILE
   * ============================================================
   */

  async delete(
    productId: string,
    fileId: string,
  ) {
    const file =
      await this.prisma.productFile.findFirst(
        {
          where: {
            id: fileId,
            productId,
          },
          include: {
            bundleRoot: {
              include: {
                assets: {
                  select: {
                    storageKey: true,
                  },
                },
              },
            },
          },
        },
      );

    if (!file) {
      throw new NotFoundException(
        `Product file "${fileId}" not found`,
      );
    }

    /**
     * If this file is the root of a bundle, deleting the root
     * also deletes the ProductFileBundle and its assets because
     * the schema uses onDelete: Cascade.
     */
    if (file.bundleRoot) {
      const bundle =
        file.bundleRoot;

      await this.prisma.productFile.delete(
        {
          where: {
            id: file.id,
          },
        },
      );

      /**
       * Delete root storage.
       */
      try {
        await this.storage.delete(
          file.storageKey,
        );
      } catch {
        // Database deletion has already succeeded.
      }

      /**
       * Delete dependency storage.
       */
      for (const asset of bundle.assets) {
        try {
          await this.storage.delete(
            asset.storageKey,
          );
        } catch {
          // Database deletion has already succeeded.
        }
      }

      return {
        message:
          "Product file bundle deleted successfully",
      };
    }

    await this.prisma.productFile.delete(
      {
        where: {
          id: file.id,
        },
      },
    );

    try {
      await this.storage.delete(
        file.storageKey,
      );
    } catch {
      // Database deletion has already succeeded.
    }

    return {
      message:
        "Product file deleted successfully",
    };
  }

  /**
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  private async validateUploadedFile(
    file: UploadedProductFile,
    options?: {
      allowMissingFormat?: boolean;
    },
  ): Promise<PreparedUploadFile> {
    if (!file) {
      throw new BadRequestException(
        "File is required",
      );
    }

    if (!file.originalname?.trim()) {
      throw new BadRequestException(
        "Uploaded file name is missing",
      );
    }

    if (
      !Buffer.isBuffer(file.buffer) ||
      file.buffer.length === 0
    ) {
      throw new BadRequestException(
        "Uploaded file is empty",
      );
    }

    const actualSize =
      file.buffer.length;

    if (file.size !== actualSize) {
      throw new BadRequestException(
        "Uploaded file size is invalid",
      );
    }

    if (
      actualSize >
      MAX_UPLOAD_SIZE_BYTES
    ) {
      throw new BadRequestException(
        `File exceeds the maximum upload size of ${
          process.env.MAX_UPLOAD_SIZE_MB ??
          100
        } MB`,
      );
    }

    const extension =
      extname(
        file.originalname,
      ).toLowerCase();

    const format =
      SUPPORTED_EXTENSIONS[
        extension as keyof typeof SUPPORTED_EXTENSIONS
      ];

    if (!format) {
      if (
        options?.allowMissingFormat
      ) {
        return {
          originalName:
            file.originalname,
          format: null,
          fileType: null,
          mimeType:
            file.mimetype ??
            "application/octet-stream",
        };
      }

      throw new BadRequestException(
        `Unsupported file format "${extension || "unknown"}". Supported formats: ${Object.keys(
          SUPPORTED_EXTENSIONS,
        ).join(", ")}`,
      );
    }

    this.validateMimeType(
      format,
      file.mimetype ?? undefined,
    );

    await this.contentValidator.validate(
      format,
      file.buffer,
    );

    return {
      originalName:
        file.originalname,
      format,
      fileType:
        getProductFileType(
          format,
        ),
      mimeType:
        this.getCanonicalMimeType(
          format,
        ),
    };
  }

  /**
   * ============================================================
   * PRODUCT
   * ============================================================
   */

  private async ensureProductExists(
    productId: string,
  ) {
    const product =
      await this.prisma.product.findUnique(
        {
          where: {
            id: productId,
          },
          select: {
            id: true,
          },
        },
      );

    if (!product) {
      throw new NotFoundException(
        `Product "${productId}" not found`,
      );
    }
  }

  /**
   * ============================================================
   * SERIALIZATION
   * ============================================================
   */

  private serializeFile<
    T extends {
      id: string;
      productId: string;
      storageKey: string;
      storageUrl: string | null;
      fileSize: bigint;
    },
  >(file: T) {
    return {
      ...file,
      storageUrl:
        file.storageUrl ??
        this.storage.getPublicAssetUrl(file.storageKey),
      fileSize: file.fileSize.toString(),
    };
  }

  /**
   * ============================================================
   * PATH SECURITY
   * ============================================================
   */

  private normalizeBundlePath(
    value: string,
  ) {
    if (!value?.trim()) {
      return "";
    }

    const normalized =
      value
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    if (
      normalized.includes("\0")
    ) {
      return "";
    }

    const parts =
      normalized.split("/");

    if (
      parts.some(
        (part) =>
          part === ".." ||
          part === ".",
      )
    ) {
      return "";
    }

    const cleaned =
      posix.normalize(
        normalized,
      );

    if (
      cleaned === "." ||
      cleaned.startsWith("../") ||
      cleaned.includes("/../") ||
      cleaned.startsWith("/")
    ) {
      return "";
    }

    return cleaned;
  }

  /**
   * ============================================================
   * MIME TYPES
   * ============================================================
   */

  private getCanonicalMimeType(
    format: ProductFileFormat,
  ): string {
    switch (format) {
      case ProductFileFormat.PNG:
        return "image/png";

      case ProductFileFormat.JPG:
      case ProductFileFormat.JPEG:
        return "image/jpeg";

      case ProductFileFormat.WEBP:
        return "image/webp";

      case ProductFileFormat.SVG:
        return "image/svg+xml";

      case ProductFileFormat.PDF:
        return "application/pdf";

      case ProductFileFormat.GLB:
        return "model/gltf-binary";

      case ProductFileFormat.GLTF:
        return "model/gltf+json";

      case ProductFileFormat.ABC:
      case ProductFileFormat.USD:
      case ProductFileFormat.USDA:
      case ProductFileFormat.USDC:
      case ProductFileFormat.OBJ:
      case ProductFileFormat.PLY:
      case ProductFileFormat.STL:
      case ProductFileFormat.BVH:
      case ProductFileFormat.FBX:
        return "application/octet-stream";

      default:
        throw new Error(
          `Unsupported product file format: ${format}`,
        );
    }
  }

  private validateMimeType(
    format: ProductFileFormat,
    mimeType?: string,
  ) {
    if (!mimeType) {
      return;
    }

    const normalized =
      mimeType
        .split(";", 1)[0]
        .trim()
        .toLowerCase();

    /**
     * Some model formats are commonly uploaded by browsers
     * as application/octet-stream.
     */
    if (
      normalized ===
      "application/octet-stream"
    ) {
      return;
    }

    if (
      MODEL_FORMATS.has(format)
    ) {
      const allowed =
        new Set([
          "application/json",
          "model/gltf+json",
          "model/gltf-binary",
          "model/obj",
          "model/stl",
          "text/plain",
          "application/vnd.ms-pki.stl",
          "application/x-tgif",
          "application/x-3ds",
          "application/x-blender",
        ]);

      if (
        !allowed.has(normalized)
      ) {
        throw new BadRequestException(
          `Unexpected MIME type "${mimeType}" for ${format}`,
        );
      }

      return;
    }

    if (
      IMAGE_FORMATS.has(format)
    ) {
      const allowedByFormat:
        Partial<
          Record<
            ProductFileFormat,
            Set<string>
          >
        > = {
        [ProductFileFormat.PNG]:
          new Set([
            "image/png",
          ]),

        [ProductFileFormat.JPG]:
          new Set([
            "image/jpeg",
          ]),

        [ProductFileFormat.JPEG]:
          new Set([
            "image/jpeg",
          ]),

        [ProductFileFormat.WEBP]:
          new Set([
            "image/webp",
          ]),

        [ProductFileFormat.SVG]:
          new Set([
            "image/svg+xml",
            "text/xml",
            "application/xml",
          ]),
      };

      const allowed =
        allowedByFormat[format];

      if (
        allowed &&
        !allowed.has(normalized)
      ) {
        throw new BadRequestException(
          `Unexpected MIME type "${mimeType}" for ${format}`,
        );
      }

      return;
    }

    if (
      DOCUMENT_FORMATS.has(format)
    ) {
      if (
        format ===
          ProductFileFormat.PDF &&
        normalized !==
          "application/pdf"
      ) {
        throw new BadRequestException(
          `Unexpected MIME type "${mimeType}" for PDF`,
        );
      }
    }
  }
}