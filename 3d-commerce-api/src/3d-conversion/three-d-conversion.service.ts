import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ProcessingJobStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { THREE_D_CONVERSION_EXTENSION_SET, THREE_D_CONVERSION_MAX_BYTES } from "./three-d-conversion.constants";

const PART_SIZE = 8 * 1024 * 1024;
type UploadPart = { PartNumber: number; ETag: string };

@Injectable()
export class ThreeDConversionService {
  private readonly logger = new Logger(ThreeDConversionService.name);

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async start(
    originalName: string,
    size: number,
    createdById?: string,
    options?: { targetProductId?: string; optimizationPreset?: string },
  ) {
    const name = originalName?.trim();
    if (!name) throw new BadRequestException("Original filename is required");
    if (!Number.isInteger(size) || size <= 0 || size > THREE_D_CONVERSION_MAX_BYTES) {
      throw new BadRequestException(
        "3D conversion input must be between 1 byte and " +
          THREE_D_CONVERSION_MAX_BYTES / (1024 * 1024) +
          " MB",
      );
    }

    const inputExt = extname(name).toLowerCase();
    if (!THREE_D_CONVERSION_EXTENSION_SET.has(inputExt)) {
      throw new BadRequestException("Unsupported 3D conversion format: " + (inputExt || "unknown"));
    }

    const job = await this.prisma.threeDConversionJob.create({
      data: {
        originalName: name.slice(0, 255),
        sourceStorageKey: "pending",
        inputExt,
        status: ProcessingJobStatus.PROCESSING,
        stage: "UPLOADING",
        targetProductId: options?.targetProductId ?? null,
        optimizationPreset: options?.optimizationPreset === "SMALLEST" ? "SMALLEST" : "BALANCED",
        createdById: createdById ?? null,
      },
    });

    const key = "conversions/" + job.id + "/source/" + randomUUID() + inputExt;
    await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: { sourceStorageKey: key },
    });

    let uploadId = "";
    try {
      uploadId = await this.storage.createMultipartUpload(key);
      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: { uploadId },
      });
      const total = Math.ceil(size / PART_SIZE);
      const parts = await Promise.all(
        Array.from({ length: total }, async (_, index) => ({
          partNumber: index + 1,
          url: await this.storage.presignMultipartPart(key, uploadId, index + 1),
        })),
      );
      return { jobId: job.id, key, uploadId, partSize: PART_SIZE, parts };
    } catch (error) {
      if (uploadId) {
        await this.storage.abortMultipartUpload(key, uploadId).catch(() => undefined);
      }
      await this.storage.delete(key).catch(() => undefined);
      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          uploadId: null,
          status: ProcessingJobStatus.FAILED,
          stage: "FAILED",
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  async complete(
    jobId: string,
    body: { key: string; uploadId: string; size: number; parts: UploadPart[] },
  ) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.PROCESSING) {
      throw new BadRequestException("Conversion upload is not active");
    }
    if (!job.uploadId || body?.key !== job.sourceStorageKey || body.uploadId !== job.uploadId) {
      throw new BadRequestException("Invalid conversion upload session");
    }
    if (
      !Number.isInteger(body.size) ||
      body.size <= 0 ||
      body.size > THREE_D_CONVERSION_MAX_BYTES
    ) {
      throw new BadRequestException("Invalid uploaded size");
    }

    const expectedParts = Math.ceil(body.size / PART_SIZE);
    if (!Array.isArray(body.parts) || body.parts.length !== expectedParts) {
      throw new BadRequestException("Multipart part count does not match file size");
    }

    const parts = [...body.parts]
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map((part) => ({ PartNumber: Number(part.PartNumber), ETag: String(part.ETag) }));

    if (
      parts.some(
        (part, index) =>
          part.PartNumber !== index + 1 ||
          !part.ETag ||
          part.ETag.length > 256,
      )
    ) {
      throw new BadRequestException("Invalid multipart ETags");
    }

    try {
      await this.storage.completeMultipartUpload(job.sourceStorageKey, body.uploadId, parts);
      const uploadedSize = await this.storage.getObjectSize(job.sourceStorageKey);
      if (uploadedSize !== body.size) throw new BadRequestException("Uploaded size does not match");
    } catch (error) {
      await this.storage.abortMultipartUpload(job.sourceStorageKey, body.uploadId).catch(() => undefined);
      await this.storage.delete(job.sourceStorageKey).catch(() => undefined);
      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          uploadId: null,
          status: ProcessingJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      }).catch(() => undefined);
      throw error;
    }

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: {
        uploadId: null,
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        originalSize: BigInt(body.size),
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    return this.serialize(updated);
  }

  async abort(jobId: string, uploadId: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.PROCESSING) {
      throw new BadRequestException("Conversion upload is not active");
    }
    if (!job.uploadId || uploadId !== job.uploadId) {
      throw new BadRequestException("Invalid conversion upload session");
    }

    await this.storage.abortMultipartUpload(job.sourceStorageKey, job.uploadId);
    await this.storage.delete(job.sourceStorageKey).catch(() => undefined);

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: {
        uploadId: null,
        status: ProcessingJobStatus.FAILED,
        stage: "FAILED",
        errorMessage: "Upload cancelled",
        completedAt: new Date(),
      },
    });
    return this.serialize(updated);
  }

  async findAll() {
    const jobs = await this.prisma.threeDConversionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jobs.map((job) => this.serialize(job));
  }

  async findProductsWithoutModel() {
    const products = await this.prisma.product.findMany({
      where: {
        NOT: {
          OR: [
            {
              media: {
                some: { type: "MODEL_PREVIEW" },
              },
            },
            {
              files: {
                some: {
                  fileType: "MODEL",
                  format: "GLB",
                },
              },
            },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    return products;
  }

  async findOne(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    return this.serialize(job);
  }

  async retry(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.FAILED) {
      throw new BadRequestException("Only failed conversion jobs can be retried");
    }
    if (job.stage === "PUBLISHED") {
      throw new BadRequestException("Published conversion jobs cannot be retried");
    }

    const sourceAvailable =
      (await this.storage.exists(job.sourceStorageKey)) ||
      Boolean(job.convertedStorageKey && (await this.storage.exists(job.convertedStorageKey)));
    if (!sourceAvailable) {
      throw new BadRequestException("No source or converted GLB is available for retry");
    }

    if (job.outputStorageKey) {
      // Do not queue the retry until the previous output has actually been
      // removed. Otherwise a stale output object can be mistaken for the new
      // attempt's result.
      await this.storage.delete(job.outputStorageKey);
    }

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id },
      data: {
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        outputStorageKey: null,
        outputSize: null,
        optimizerWarning: null,
      },
    });
    return this.serialize(updated);
  }

  async remove(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");

    // Abort any active multipart session before removing the database record.
    // The uploadId is persisted so deleting an in-progress job cannot leave
    // an orphaned multipart upload in B2.
    if (job.uploadId) {
      await this.storage.abortMultipartUpload(job.sourceStorageKey, job.uploadId);
    }

    // A source is conversion-owned only when deleteSourceOnSuccess is true.
    // Existing product GLBs and re-run sources deliberately set this to false.
    // In particular, reruns can have convertedStorageKey === sourceStorageKey;
    // never delete that catalog-owned object.
    const keys = new Set<string>();
    if (job.deleteSourceOnSuccess && job.sourceStorageKey !== "pending") {
      keys.add(job.sourceStorageKey);
    }
    if (job.convertedStorageKey && (job.deleteSourceOnSuccess || job.convertedStorageKey !== job.sourceStorageKey)) {
      keys.add(job.convertedStorageKey);
    }
    if (job.outputStorageKey) {
      keys.add(job.outputStorageKey);
    }

    // Clean storage before deleting the DB row. If storage cleanup fails,
    // keep the job so the admin can retry deletion rather than reporting a
    // false successful delete.
    for (const key of keys) {
      await this.storage.delete(key);
    }

    await this.prisma.threeDConversionJob.delete({ where: { id } });
    return { deleted: true, deletedStorageKeys: keys.size };
  }

  async download(id: string, kind: "optimized" | "converted" = "optimized") {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");

    const key = kind === "converted" ? job.convertedStorageKey : job.outputStorageKey;
    if (job.status !== ProcessingJobStatus.COMPLETED || !key) {
      throw new NotFoundException("Requested GLB is not ready");
    }

    const stream = await this.storage.createReadStream(key);
    return {
      stream,
      filename:
        kind === "converted"
          ? this.outputName(job.originalName, "-converted")
          : this.outputName(job.originalName, "-web-optimized"),
    };
  }

  async createFromExistingGlb(
    productId: string,
    productFileId: string,
    optimizationPreset: string = "BALANCED",
  ) {
    const file = await this.prisma.productFile.findFirst({
      where: {
        id: productFileId,
        productId,
        fileType: "MODEL",
        format: "GLB",
      },
      select: {
        id: true,
        productId: true,
        originalName: true,
        storageKey: true,
        fileSize: true,
      },
    });
    if (!file) throw new NotFoundException("GLB product file not found");

    const job = await this.prisma.threeDConversionJob.create({
      data: {
        originalName: file.originalName,
        sourceStorageKey: file.storageKey,
        inputExt: ".glb",
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        originalSize: file.fileSize,
        targetProductId: productId,
        optimizationPreset: optimizationPreset === "SMALLEST" ? "SMALLEST" : "BALANCED",
        deleteSourceOnSuccess: false,
      },
    });

    return this.serialize(job);
  }

  async rerun(id: string, optimizationPreset: string = "BALANCED") {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (!job.convertedStorageKey || !(await this.storage.exists(job.convertedStorageKey))) {
      throw new BadRequestException("Converted GLB is not available for a re-run");
    }

    const rerun = await this.prisma.threeDConversionJob.create({
      data: {
        originalName: job.originalName,
        sourceStorageKey: job.convertedStorageKey,
        inputExt: ".glb",
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        originalSize: job.convertedSize,
        targetProductId: job.targetProductId,
        optimizationPreset: optimizationPreset === "SMALLEST" ? "SMALLEST" : "BALANCED",
        deleteSourceOnSuccess: false,
      },
    });

    return this.serialize(rerun);
  }

  async publish(id: string, productId: string) {
    const claimed = await this.prisma.threeDConversionJob.updateMany({
      where: { id, status: ProcessingJobStatus.COMPLETED, stage: "READY" },
      data: { stage: "PUBLISHING" },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException("Job is not READY or is already being published");
    }

    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.COMPLETED || !job.outputStorageKey || job.stage !== "PUBLISHING") {
      throw new BadRequestException("Conversion job publish claim is invalid");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Target product not found");

    const destinationKey = `products/${productId}/models/${job.id}.glb`;
    await this.storage.copy(job.outputStorageKey, destinationKey);
    const url = this.storage.getPublicAssetUrl(destinationKey);

    try {
      const published = await this.prisma.$transaction(async (tx) => {
        const file = await tx.productFile.create({
          data: {
            productId,
            originalName: job.originalName || "model.glb",
            storageKey: destinationKey,
            storageUrl: url,
            format: "GLB",
            fileType: "MODEL",
            mimeType: "model/gltf-binary",
            fileSize: job.outputSize ?? BigInt(0),
            processingStatus: "COMPLETED",
          },
        });

        await tx.productMedia.deleteMany({
          where: { productId, type: "MODEL_PREVIEW" },
        });

        await tx.productMedia.create({
          data: {
            productId,
            type: "MODEL_PREVIEW",
            url,
            altText: job.originalName || "GLB model",
            sortOrder: 0,
            isPrimary: true,
          },
        });

        return tx.threeDConversionJob.update({
          where: { id: id },
          data: {
            targetProductId: productId,
            publishedFileId: file.id,
            publishedAt: new Date(),
            stage: "PUBLISHED",
            status: ProcessingJobStatus.COMPLETED,
            errorMessage: null,
          },
          include: { publishedFile: true },
        });
      });

      await this.notifyStorefrontRevalidation(productId);

      if (job.deleteSourceOnSuccess && job.sourceStorageKey === job.convertedStorageKey) {
        await this.storage.delete(job.sourceStorageKey).catch((error) => {
          this.logger.warn(`Unable to delete original GLB source ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
        });
      }

      return this.serialize(published);
    } catch (error) {
      await this.prisma.threeDConversionJob.updateMany({
        where: { id, stage: "PUBLISHING" },
        data: { stage: "READY" },
      });
      await this.storage.delete(destinationKey).catch(() => undefined);
      throw error;
    }
  }

  private async notifyStorefrontRevalidation(productId: string) {
    const url = process.env.STOREFRONT_REVALIDATE_URL?.trim();
    const secret = process.env.CATALOG_REVALIDATE_SECRET?.trim();
    if (!url || !secret) return;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-catalog-revalidate-secret": secret,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Storefront revalidation returned HTTP ${response.status} for product ${productId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Storefront revalidation failed for product ${productId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  serialize(job: any) {
    return {
      ...job,
      originalSize: job.originalSize == null ? null : job.originalSize.toString(),
      convertedSize: job.convertedSize == null ? null : job.convertedSize.toString(),
      outputSize: job.outputSize == null ? null : job.outputSize.toString(),
    };
  }

  private outputName(originalName: string, suffix = "") {
    const base =
      originalName.replace(/\\/g, "/").split("/").pop()?.replace(/\.[^.]+$/, "") || "model";
    return base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 170) + suffix + ".glb";
  }

}
