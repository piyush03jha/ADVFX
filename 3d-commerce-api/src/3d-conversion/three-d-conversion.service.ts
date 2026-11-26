import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma, ProcessingJobStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { THREE_D_CONVERSION_EXTENSION_SET } from "./three-d-conversion.constants";

const PART_SIZE = 8 * 1024 * 1024;
// Keep part count within S3-compatible multipart limits, not an application file-size cap.
function partSizeFor(size: number) {
  return Math.max(PART_SIZE, Math.ceil(size / 9000 / PART_SIZE) * PART_SIZE);
}
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
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new BadRequestException("Choose a non-empty 3D conversion input");
    }

    const inputExt = extname(name).toLowerCase();
    if (!THREE_D_CONVERSION_EXTENSION_SET.has(inputExt)) {
      throw new BadRequestException("Unsupported 3D conversion format: " + (inputExt || "unknown"));
    }

    if (options?.targetProductId) {
      const product = await this.prisma.product.findUnique({ where: { id: options.targetProductId }, select: { id: true } });
      if (!product) throw new NotFoundException("Target product not found");
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
        deleteSourceOnSuccess: true,
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
      const partSize = partSizeFor(size);
      const total = Math.ceil(size / partSize);
      const parts = await Promise.all(
        Array.from({ length: total }, async (_, index) => ({
          partNumber: index + 1,
          url: await this.storage.presignMultipartPart(key, uploadId, index + 1),
        })),
      );
      return { jobId: job.id, key, uploadId, partSize, parts };
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
    let job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    // The worker may already have claimed or finished the job before the
    // client receives the completion response. Never finalize storage twice.
    if (!job.uploadId && job.originalSize != null && job.status !== ProcessingJobStatus.FAILED) return this.serialize(job);
    if (job.status === ProcessingJobStatus.QUEUED) return this.serialize(job);
    if (job.status !== ProcessingJobStatus.PROCESSING) {
      throw new BadRequestException("Conversion upload is not active");
    }
    if (!job.uploadId || body?.key !== job.sourceStorageKey || body.uploadId !== job.uploadId) {
      throw new BadRequestException("Invalid conversion upload session");
    }
    if (
      !Number.isSafeInteger(body.size) ||
      body.size <= 0
    ) {
      throw new BadRequestException("Invalid uploaded size");
    }

    const expectedParts = Math.ceil(body.size / partSizeFor(body.size));
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

    // Claim the upload before touching object storage. A conditional update makes
    // the UPLOADING -> COMPLETING transition atomic across API replicas.
    if (job.stage === "UPLOADING") {
      const claimed = await this.prisma.threeDConversionJob.updateMany({
        where: {
          id: job.id,
          status: ProcessingJobStatus.PROCESSING,
          stage: "UPLOADING",
          uploadId: body.uploadId,
        },
        data: {
          stage: "COMPLETING",
          completionSize: BigInt(body.size),
          completionParts: parts,
        },
      });
      job = await this.prisma.threeDConversionJob.findUnique({ where: { id: job.id } });
      if (!job) throw new NotFoundException("Conversion job not found");
      if (claimed.count !== 1) {
        if (!job.uploadId && job.originalSize != null && job.status !== ProcessingJobStatus.FAILED) return this.serialize(job);
        throw new ConflictException("Conversion upload is already being finalized");
      }
    } else if (job.stage === "COMPLETING") {
      // A COMPLETING row is a short lease. Only take it over after the previous
      // caller has gone stale, preventing two simultaneous retries from asking
      // object storage to finalize the same multipart upload.
      const staleBefore = new Date(Date.now() - 30_000);
      const takeover = await this.prisma.threeDConversionJob.updateMany({
        where: {
          id: job.id,
          status: ProcessingJobStatus.PROCESSING,
          stage: "COMPLETING",
          uploadId: body.uploadId,
          updatedAt: { lt: staleBefore },
        },
        data: { updatedAt: new Date() },
      });
      if (takeover.count !== 1) {
        throw new ConflictException("Conversion upload is already being finalized");
      }
      job = await this.prisma.threeDConversionJob.findUnique({ where: { id: job.id } });
      if (!job) throw new NotFoundException("Conversion job not found");
    } else {
      throw new BadRequestException("Conversion upload is not in a completable state");
    }

    // A worker/process can crash after the storage provider finishes multipart
    // completion but before PostgreSQL records QUEUED. On retry, treat an already
    // completed object with the expected size as success. Do not destroy the
    // multipart session/object on transient errors; keep COMPLETING recoverable.
    let uploadedSize: number | null = null;
    try {
      await this.storage.completeMultipartUpload(job.sourceStorageKey, body.uploadId, parts);
      uploadedSize = await this.storage.getObjectSize(job.sourceStorageKey);
    } catch (error) {
      try {
        uploadedSize = await this.storage.getObjectSize(job.sourceStorageKey);
      } catch {
        this.logger.warn(
          `Multipart completion for job ${job.id} is still pending and can be retried: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw new ServiceUnavailableException("Upload completion is being reconciled. Please retry shortly.");
      }
    }

    if (uploadedSize !== body.size) {
      await this.storage.abortMultipartUpload(job.sourceStorageKey, body.uploadId).catch(() => undefined);
      await this.storage.delete(job.sourceStorageKey).catch(() => undefined);
      await this.prisma.threeDConversionJob.updateMany({
        where: {
          id: job.id,
          status: ProcessingJobStatus.PROCESSING,
          stage: "COMPLETING",
          uploadId: body.uploadId,
        },
        data: {
          uploadId: null,
          status: ProcessingJobStatus.FAILED,
          stage: "FAILED",
          errorMessage: "Uploaded size does not match",
          completedAt: new Date(),
        },
      });
      throw new BadRequestException("Uploaded size does not match");
    }

    await this.prisma.threeDConversionJob.updateMany({
      where: {
        id: job.id,
        status: ProcessingJobStatus.PROCESSING,
        stage: "COMPLETING",
        uploadId: body.uploadId,
      },
      data: {
        uploadId: null,
        completionSize: null,
        completionParts: Prisma.DbNull,
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        originalSize: BigInt(body.size),
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    const completed = await this.prisma.threeDConversionJob.findUnique({ where: { id: job.id } });
    if (!completed) throw new NotFoundException("Conversion job not found");
    if (completed.status !== ProcessingJobStatus.QUEUED && (completed.uploadId || completed.originalSize == null || completed.status === ProcessingJobStatus.FAILED)) {
      throw new ConflictException("Conversion upload could not be queued; retry completion");
    }
    return this.serialize(completed);
  }

  async abort(jobId: string, uploadId: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.PROCESSING || job.stage !== "UPLOADING") {
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
        status: { not: "ARCHIVED" },
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
      // Retry is allowed even if cleanup of an old output object has a
      // transient storage failure. The worker writes the same immutable
      // conversion-owned output key for the new attempt. Keeping this best
      // effort prevents a B2 hiccup from blocking an otherwise valid retry.
      await this.storage.delete(job.outputStorageKey).catch((error) => {
        this.logger.warn(
          `Unable to remove previous conversion output ${job.id}; continuing retry: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
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

    const publishedFile = kind === "optimized" && job.stage === "PUBLISHED" && job.publishedFileId
      ? await this.prisma.productFile.findUnique({ where: { id: job.publishedFileId }, select: { storageKey: true } })
      : null;
    const key = kind === "converted" ? job.convertedStorageKey : publishedFile?.storageKey ?? job.outputStorageKey;
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
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException("Target product not found");
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

    const destinationKey = `products/${productId}/models/${job.id}.glb`;
    const url = this.storage.getPublicAssetUrl(destinationKey);

    try {
      if (!url) throw new BadRequestException("Public model storage URL is not configured");
      await this.storage.copy(job.outputStorageKey, destinationKey);
      const actualSize = await this.storage.getObjectSize(destinationKey);
      if (!job.outputSize || actualSize <= 0 || BigInt(actualSize) !== job.outputSize) {
        throw new BadRequestException("Published GLB size could not be verified");
      }
      const published = await this.prisma.$transaction(async (tx) => {
        const file = await tx.productFile.create({
          data: {
            productId,
            originalName: this.outputName(job.originalName || "model.glb", "-web-optimized"),
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

      if (job.deleteSourceOnSuccess) {
        await this.discardConversionIntermediates(job, destinationKey).catch((error) => {
          this.logger.warn(`Published model is safe; cleanup can be retried for ${job.id}: ${String(error)}`);
        });
      } else if (published.publishedFileId) {
        await this.discardReplacedCatalogSource(job, productId, published.publishedFileId, destinationKey);
      }

      return this.serialize(published);
    } catch (error) {
      const reset = await this.prisma.threeDConversionJob.updateMany({
        where: { id, stage: "PUBLISHING" },
        data: { stage: "READY" },
      });
      // If the attachment transaction committed, never remove its live model.
      if (reset.count === 1) await this.storage.delete(destinationKey).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Once the optimized GLB has been copied to its permanent product location,
   * the conversion-owned copies (direct GLB source, converted GLB and the
   * staging "output" object) are dead weight. Delete them so only the
   * optimized model stays in storage. Keys are cleared on the job row only
   * after the object is really gone; anything that fails to delete stays
   * referenced so remove() can still clean it up later.
   */
  private async discardConversionIntermediates(
    job: {
      id: string;
      sourceStorageKey: string;
      convertedStorageKey: string | null;
      outputStorageKey: string | null;
    },
    keepKey: string,
  ) {
    const clear: { convertedStorageKey?: null; outputStorageKey?: null; sourceStorageKey?: string } = {};
    const targets = new Map<string, Array<"convertedStorageKey" | "outputStorageKey" | "sourceStorageKey">>();
    const add = (key: string | null, field: "convertedStorageKey" | "outputStorageKey" | "sourceStorageKey") => {
      if (!key || key === "pending" || key === keepKey) return;
      targets.set(key, [...(targets.get(key) ?? []), field]);
    };
    add(job.convertedStorageKey, "convertedStorageKey");
    add(job.outputStorageKey, "outputStorageKey");
    add(job.sourceStorageKey, "sourceStorageKey");

    // Delete each object once; only clear references after its deletion succeeds.
    for (const [key, fields] of targets) {
      try {
        await this.storage.delete(key);
        for (const field of fields) {
          if (field === "sourceStorageKey") clear.sourceStorageKey = "pending";
          else clear[field] = null;
        }
      } catch (error) {
        this.logger.warn(
          `Unable to delete conversion intermediate ${key} for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (Object.keys(clear).length > 0) {
      await this.prisma.threeDConversionJob
        .update({ where: { id: job.id }, data: clear })
        .catch(() => undefined);
    }
  }

  /**
   * Jobs that start from a catalog-owned GLB (an uploaded product file, or an
   * admin re-optimize) have deleteSourceOnSuccess=false, because the source is
   * a live ProductFile and must not be touched until a replacement exists.
   * Once the optimized GLB is published that original is superseded: remove the
   * staging "output" copy and the original ProductFile (object + row) so only
   * the optimized model stays in storage.
   *
   * This runs inside publish()'s try block, whose catch deletes the published
   * file. It therefore must never throw. Nothing is deleted unless the
   * published object is confirmed to exist, and a delete that fails leaves the
   * original referenced and intact.
   */
  private async discardReplacedCatalogSource(
    job: {
      id: string;
      sourceStorageKey: string;
      convertedStorageKey: string | null;
      outputStorageKey: string | null;
    },
    productId: string,
    publishedFileId: string,
    keepKey: string,
  ) {
    try {
      if (!(await this.storage.exists(keepKey))) {
        this.logger.warn(`Published model ${keepKey} not found; keeping the original for job ${job.id}`);
        return;
      }

      const clear: { convertedStorageKey?: null; outputStorageKey?: null } = {};

      if (job.outputStorageKey && job.outputStorageKey !== keepKey) {
        try {
          await this.storage.delete(job.outputStorageKey);
          clear.outputStorageKey = null;
        } catch (error) {
          this.logger.warn(
            `Unable to delete staging output ${job.outputStorageKey} for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Only a MODEL GLB that belongs to this product and is not a bundle root
      // is the superseded original. A re-run's source is another job's
      // converted GLB, which matches no ProductFile and is left alone.
      const original = job.sourceStorageKey && job.sourceStorageKey !== "pending"
        ? await this.prisma.productFile.findFirst({
            where: {
              productId,
              storageKey: job.sourceStorageKey,
              id: { not: publishedFileId },
              fileType: "MODEL",
              format: "GLB",
            },
            select: { id: true, storageKey: true, bundleRoot: { select: { id: true } } },
          })
        : null;

      if (original && !original.bundleRoot && original.storageKey !== keepKey) {
        try {
          await this.storage.delete(original.storageKey);
          await this.prisma.productFile.delete({ where: { id: original.id } });
          if (job.convertedStorageKey === original.storageKey) clear.convertedStorageKey = null;
        } catch (error) {
          this.logger.warn(
            `Unable to remove original model ${original.id} for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (Object.keys(clear).length > 0) {
        await this.prisma.threeDConversionJob.update({ where: { id: job.id }, data: clear });
      }
    } catch (error) {
      this.logger.warn(
        `Original cleanup skipped for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      completionSize: job.completionSize == null ? null : job.completionSize.toString(),
      ...(job.publishedFile ? { publishedFile: { ...job.publishedFile, fileSize: job.publishedFile.fileSize == null ? null : job.publishedFile.fileSize.toString() } } : {}),
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
