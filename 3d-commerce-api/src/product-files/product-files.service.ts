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

interface BundleUploadFile extends UploadedProductFile {
  relativePath: string;
}

interface PreparedUploadFile {
  originalName: string;
  format: ProductFileFormat | null;
  fileType: ReturnType<typeof getProductFileType> | null;
  mimeType: string;
}

interface StoredBundleFile {
  normalizedPath: string;
  originalName: string;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  format: ProductFileFormat | null;
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

  /**
   * ============================================================
   * MULTI-FILE ASSET BUNDLE
   * ============================================================
   *
   * Current bundle architecture:
   *
   * Product
   *   └── ProductFileBundle
   *        ├── rootFile -> ProductFile
   *        └── assets[]
   *             ├── ProductFileBundleAsset
   *             ├── ProductFileBundleAsset
   *             └── ...
   *
   * Example:
   *
   * files:
   *   IronMan.gltf
   *   IronMan.bin
   *   textures/body.jpg
   *   textures/armor.jpg
   *
   * entryPoint:
   *   IronMan.gltf
   *
   * The root file is stored as ProductFile.
   * Dependency files are stored as ProductFileBundleAsset.
   */

  async uploadBundle(
    productId: string,
    files: BundleUploadFile[],
    entryPoint: string,
  ) {
    await this.ensureProductExists(productId);

    if (!files || files.length === 0) {
      throw new BadRequestException(
        "At least one bundle file is required",
      );
    }

    const maxFiles =
      this.getBundleMaxFiles();

    if (files.length > maxFiles) {
      throw new BadRequestException(
        `A bundle may contain at most ${maxFiles} files`,
      );
    }

    const normalizedEntryPoint =
      this.normalizeBundlePath(
        entryPoint,
      );

    if (!normalizedEntryPoint) {
      throw new BadRequestException(
        "Bundle entry point is required",
      );
    }

    const preparedFiles: Array<
      BundleUploadFile & {
        normalizedPath: string;
        format: ProductFileFormat | null;
        fileType:
          | ReturnType<typeof getProductFileType>
          | null;
      }
    > = [];

    let totalSize = 0;

    for (const file of files) {
      if (!file) {
        throw new BadRequestException(
          "Invalid bundle file",
        );
      }

      if (!file.relativePath?.trim()) {
        throw new BadRequestException(
          "Every bundle file must have a relative path",
        );
      }

      const normalizedPath =
        this.normalizeBundlePath(
          file.relativePath,
        );

      if (!normalizedPath) {
        throw new BadRequestException(
          `Invalid bundle path "${file.relativePath}"`,
        );
      }

      const originalNormalizedPath =
        file.relativePath.replace(
          /\\/g,
          "/",
        );

      if (
        normalizedPath !==
        originalNormalizedPath
      ) {
        throw new BadRequestException(
          `Unsafe bundle path "${file.relativePath}"`,
        );
      }

      if (
        preparedFiles.some(
          (item) =>
            item.normalizedPath ===
            normalizedPath,
        )
      ) {
        throw new BadRequestException(
          `Duplicate bundle path "${normalizedPath}"`,
        );
      }

      const prepared =
        await this.validateUploadedFile(
          {
            originalname:
              posix.basename(
                normalizedPath,
              ),
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          },
          {
            allowMissingFormat: true,
          },
        );

      totalSize +=
        file.buffer.length;

      if (
        totalSize >
        this.getBundleMaxTotalSize()
      ) {
        throw new BadRequestException(
          `Bundle exceeds the maximum total size of ${this.getBundleMaxTotalSizeMb()} MB`,
        );
      }

      preparedFiles.push({
        ...file,
        normalizedPath,
        format: prepared.format,
        fileType: prepared.fileType,
      });
    }

    const entryPointFile =
      preparedFiles.find(
        (file) =>
          file.normalizedPath ===
          normalizedEntryPoint,
      );

    if (!entryPointFile) {
      throw new BadRequestException(
        `Bundle entry point "${normalizedEntryPoint}" was not found`,
      );
    }

    const entryPointExtension =
      extname(
        normalizedEntryPoint,
      ).toLowerCase();

    const entryPointFormat =
      SUPPORTED_EXTENSIONS[
        entryPointExtension as keyof typeof SUPPORTED_EXTENSIONS
      ];

    if (
      entryPointFormat !==
      ProductFileFormat.GLTF
    ) {
      throw new BadRequestException(
        "Asset bundle entry point must currently be a .gltf file",
      );
    }

    if (
      entryPointFile.format !==
      ProductFileFormat.GLTF
    ) {
      throw new BadRequestException(
        "Bundle entry point could not be validated as a GLTF file",
      );
    }

    if (
      entryPointFile.fileType !==
      getProductFileType(
        ProductFileFormat.GLTF,
      )
    ) {
      throw new BadRequestException(
        "Bundle entry point must be a model file",
      );
    }

    /**
     * Prisma allows explicitly supplying the ID.
     * We generate it locally so we do not need to create
     * a temporary invalid ProductFileBundle record.
     */
    const bundleId =
      randomUUID();

    const storedFiles: StoredBundleFile[] =
      [];

    let createdProductFileId:
      | string
      | null = null;

    let bundleCreated =
      false;

    try {
      /**
       * --------------------------------------------------------
       * STORE ALL FILES
       * --------------------------------------------------------
       */

      for (const file of preparedFiles) {
        const stored =
          await this.storage.saveBundleFile(
            productId,
            bundleId,
            file.normalizedPath,
            file.buffer,
          );

        storedFiles.push({
          normalizedPath:
            file.normalizedPath,
          originalName:
            posix.basename(
              file.normalizedPath,
            ),
          storageKey:
            stored.storageKey,
          storageUrl:
            stored.storageUrl,
          mimeType:
            file.mimetype ??
            this.getCanonicalMimeType(
              file.format ??
                ProductFileFormat.GLTF,
            ),
          fileSize:
            file.buffer.length,
          format:
            file.format,
        });
      }

      /**
       * --------------------------------------------------------
       * FIND STORED ROOT FILE
       * --------------------------------------------------------
       */

      const entryPointStored =
        storedFiles.find(
          (file) =>
            file.normalizedPath ===
            normalizedEntryPoint,
        );

      if (!entryPointStored) {
        throw new Error(
          "Bundle entry point storage record was not created",
        );
      }

      /**
       * --------------------------------------------------------
       * CREATE ROOT PRODUCT FILE
       * --------------------------------------------------------
       *
       * This must exist before ProductFileBundle because
       * ProductFileBundle.rootFileId is required.
       */

      const productFile =
        await this.prisma.productFile.create({
          data: {
            productId,
            originalName:
              posix.basename(
                normalizedEntryPoint,
              ),
            storageKey:
              entryPointStored.storageKey,
            storageUrl:
              entryPointStored.storageUrl,
            format:
              ProductFileFormat.GLTF,
            fileType:
              getProductFileType(
                ProductFileFormat.GLTF,
              ),
            mimeType:
              entryPointStored.mimeType ||
              "model/gltf+json",
            fileSize:
              BigInt(
                entryPointStored.fileSize,
              ),
            processingStatus:
              "PENDING",
          },
        });

      createdProductFileId =
        productFile.id;

      /**
       * --------------------------------------------------------
       * CREATE BUNDLE
       * --------------------------------------------------------
       *
       * Only dependency files become BundleAsset records.
       * The root remains a normal ProductFile.
       */

      const dependencyFiles =
        storedFiles.filter(
          (file) =>
            file.normalizedPath !==
            normalizedEntryPoint,
        );

      const bundle =
        await this.prisma.productFileBundle.create(
          {
            data: {
              id: bundleId,
              productId,
              rootFileId:
                productFile.id,
              assets: {
                create:
                  dependencyFiles.map(
                    (file) => ({
                      relativePath:
                        file.normalizedPath,
                      storageKey:
                        file.storageKey,
                      originalName:
                        file.originalName,
                      mimeType:
                        file.mimeType,
                      fileSize:
                        BigInt(
                          file.fileSize,
                        ),
                    }),
                  ),
              },
            },
            include: {
              rootFile: true,
              assets: {
                orderBy: {
                  relativePath:
                    "asc",
                },
              },
            },
          },
        );

      bundleCreated = true;

      /**
       * --------------------------------------------------------
       * CREATE PROCESSING JOB
       * --------------------------------------------------------
       */

      await this.processingJobs.create(
        productFile.id,
      );

      return {
        bundle:
          this.serializeBundle(
            bundle,
          ),
        entryPoint:
          this.serializeFile(
            productFile,
          ),
      };
    } catch (error) {
      /**
       * --------------------------------------------------------
       * DATABASE CLEANUP
       * --------------------------------------------------------
       */

      if (bundleCreated) {
        try {
          await this.prisma.productFileBundle.delete(
            {
              where: {
                id: bundleId,
              },
            },
          );
        } catch {
          // Preserve original error.
        }
      } else {
        /**
         * If the bundle was not created but the ProductFile
         * was, remove the root ProductFile manually.
         */
        if (createdProductFileId) {
          try {
            await this.prisma.productFile.delete(
              {
                where: {
                  id: createdProductFileId,
                },
              },
            );
          } catch {
            // Preserve original error.
          }
        }
      }

      /**
       * --------------------------------------------------------
       * STORAGE CLEANUP
       * --------------------------------------------------------
       */

      for (const stored of storedFiles) {
        try {
          await this.storage.delete(
            stored.storageKey,
          );
        } catch {
          // Preserve original error.
        }
      }

      throw error;
    }
  }

  /**
   * ============================================================
   * GET FILES
   * ============================================================
   */

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
   * GET BUNDLE
   * ============================================================
   */

  async findBundle(
    productId: string,
    bundleId: string,
  ) {
    const bundle =
      await this.prisma.productFileBundle.findFirst(
        {
          where: {
            id: bundleId,
            productId,
          },
          include: {
            rootFile: true,
            assets: {
              orderBy: {
                relativePath: "asc",
              },
            },
          },
        },
      );

    if (!bundle) {
      throw new NotFoundException(
        `Asset bundle "${bundleId}" not found`,
      );
    }

    return this.serializeBundle(
      bundle,
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
   * DELETE BUNDLE
   * ============================================================
   */

  async deleteBundle(
    productId: string,
    bundleId: string,
  ) {
    const bundle =
      await this.prisma.productFileBundle.findFirst(
        {
          where: {
            id: bundleId,
            productId,
          },
          include: {
            rootFile: {
              select: {
                id: true,
                storageKey: true,
              },
            },
            assets: {
              select: {
                storageKey: true,
              },
            },
          },
        },
      );

    if (!bundle) {
      throw new NotFoundException(
        `Asset bundle "${bundleId}" not found`,
      );
    }

    /**
     * Deleting the root ProductFile cascades into
     * ProductFileBundle because rootFile has onDelete: Cascade.
     *
     * If we delete the bundle first, rootFile remains.
     * Therefore remove the root ProductFile so the relationship
     * and processing job are cleaned correctly.
     */
    await this.prisma.productFile.delete(
      {
        where: {
          id: bundle.rootFile.id,
        },
      },
    );

    /**
     * Root storage.
     */
    try {
      await this.storage.delete(
        bundle.rootFile.storageKey,
      );
    } catch {
      // Database deletion has already succeeded.
    }

    /**
     * Dependency storage.
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
        "Asset bundle deleted successfully",
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
      fileSize: bigint;
    },
  >(file: T) {
    return {
      ...file,
      fileSize:
        file.fileSize.toString(),
    };
  }

  private serializeBundle(
    bundle: {
      id: string;
      productId: string;
      rootFile: {
        fileSize: bigint;
        [key: string]: unknown;
      };
      assets: Array<{
        fileSize: bigint;
        [key: string]: unknown;
      }>;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      ...bundle,
      rootFile:
        this.serializeFile(
          bundle.rootFile,
        ),
      assets:
        bundle.assets.map(
          (asset) => ({
            ...asset,
            fileSize:
              asset.fileSize.toString(),
          }),
        ),
    };
  }

  /**
   * ============================================================
   * BUNDLE LIMITS
   * ============================================================
   */

  private getBundleMaxFiles() {
    const value =
      Number(
        process.env.MAX_ASSET_BUNDLE_FILES ??
          100,
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 100;
    }

    return Math.floor(value);
  }

  private getBundleMaxTotalSize() {
    const mb =
      Number(
        process.env.MAX_ASSET_BUNDLE_SIZE_MB ??
          500,
      );

    const safeMb =
      Number.isFinite(mb) &&
      mb > 0
        ? mb
        : 500;

    return (
      safeMb *
      1024 *
      1024
    );
  }

  private getBundleMaxTotalSizeMb() {
    return Math.round(
      this.getBundleMaxTotalSize() /
        1024 /
        1024,
    );
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