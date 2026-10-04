import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import {
  ProcessingJobStatus,
  ProcessingStatus,
  ProductFileFormat,
  ProductFileType,
} from "@prisma/client";

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { FileContentValidationService } from "../product-files/file-content-validation.service";
import { ProcessingJobs2DWorker } from "./processing-jobs-2d.worker";
import { ImageProcessingService } from "./image-processing.service";

const execFileAsync = promisify(execFile);

const execFileAsync = promisify(execFile);

@Injectable()
export class ProcessingJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    ProcessingJobsWorker.name,
  );

  private readonly pollIntervalMs =
    this.getPositiveNumber(
      process.env.PROCESSING_WORKER_POLL_INTERVAL_MS,
      2000,
    );

  private readonly concurrency = Math.max(
    1,
    Math.floor(
      this.getPositiveNumber(
        process.env.PROCESSING_WORKER_CONCURRENCY,
        1,
      ),
    ),
  );

  private readonly staleAfterMs =
    this.getPositiveNumber(
      process.env.PROCESSING_WORKER_STALE_AFTER_MS,
      30 * 60 * 1000,
    );

  private isRunning = false;
  private loopPromise: Promise<void> | null = null;
  private activeJobs = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly contentValidator: FileContentValidationService,
    private readonly processingJobs2DWorker: ProcessingJobs2DWorker,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  private getPositiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start background processing automatically.
   */
  onModuleInit(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    this.logger.log(
      `Processing worker started ` +
        `(concurrency=${this.concurrency}, ` +
        `pollInterval=${this.pollIntervalMs}ms, ` +
        `staleAfter=${this.staleAfterMs}ms)`,
    );

    this.loopPromise = this.runLoop();
  }

  /**
   * Stop worker gracefully.
   */
  async onModuleDestroy(): Promise<void> {
    this.isRunning = false;

    this.logger.log(
      "Stopping processing worker...",
    );

    if (this.loopPromise) {
      await this.loopPromise;
    }

    this.logger.log(
      "Processing worker stopped.",
    );
  }

  /**
   * Main background polling loop.
   */
  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.recoverStaleJobs();
        await this.processAvailableJobs();
      } catch (error) {
        this.logger.error(
          "Processing worker loop error",
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }

      if (!this.isRunning) {
        break;
      }

      await this.sleep(
        this.pollIntervalMs,
      );
    }
  }

  /**
   * Process jobs according to concurrency.
   */
  private async processAvailableJobs(): Promise<void> {
    const jobs: Promise<void>[] = [];

    while (
      this.isRunning &&
      this.activeJobs < this.concurrency
    ) {
      const job =
        await this.claimNextJob();

      if (!job) {
        break;
      }

      this.activeJobs++;

      const promise =
        this.processClaimedJob(job)
          .catch((error) => {
            this.logger.error(
              `Unhandled error while processing job ${job.id}`,
              error instanceof Error
                ? error.stack
                : String(error),
            );
          })
          .finally(() => {
            this.activeJobs--;
          });

      jobs.push(promise);
    }

    if (jobs.length > 0) {
      await Promise.all(jobs);
    }
  }

  /**
   * Safely claim one queued job.
   */
  private async claimNextJob() {
    const candidate =
      await this.prisma.productFileProcessingJob.findFirst(
        {
          where: {
            status:
              ProcessingJobStatus.QUEUED,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
          },
        },
      );

    if (!candidate) {
      return null;
    }

    const now = new Date();

    const claimed =
      await this.prisma.productFileProcessingJob.updateMany(
        {
          where: {
            id: candidate.id,
            status:
              ProcessingJobStatus.QUEUED,
          },
          data: {
            status:
              ProcessingJobStatus.PROCESSING,
            attempts: {
              increment: 1,
            },
            startedAt: now,
            completedAt: null,
            errorMessage: null,
          },
        },
      );

    /**
     * Another worker claimed it first.
     */
    if (claimed.count !== 1) {
      return null;
    }

    const job =
      await this.prisma.productFileProcessingJob.findUnique(
        {
          where: {
            id: candidate.id,
          },
          include: {
            productFile: true,
            outputFile: true,
          },
        },
      );

    if (!job) {
      this.logger.error(
        `Claimed processing job ${candidate.id} was not found`,
      );

      return null;
    }

    await this.prisma.productFile.update({
      where: {
        id: job.productFileId,
      },
      data: {
        processingStatus:
          ProcessingStatus.PROCESSING,
        processingError: null,
      },
    });

    this.logger.log(
      `Claimed processing job ${job.id} ` +
        `(attempt ${job.attempts}/${job.maxAttempts})`,
    );

    return job;
  }

  /**
   * Process a claimed job.
   */
  private async processClaimedJob(
    job: any,
  ): Promise<void> {
    try {
      await this.processFile(
        job.productFile,
        job.id,
      );

      // Only model/PDF conversion jobs produce a replacement ProductFile.
      // Validation-only image/document jobs must retain their source file.
      const finished = await this.prisma.productFileProcessingJob.findUnique({
        where: { id: job.id },
        select: { outputFileId: true },
      });

      if (finished?.outputFileId) {
        await this.prisma.productFile.update({
          where: { id: job.productFileId },
          data: {
            processingStatus: ProcessingStatus.COMPLETED,
            processingError: null,
          },
        });

        await this.prisma.productFileProcessingJob.update({
          where: { id: job.id },
          data: {
            status: ProcessingJobStatus.COMPLETED,
            completedAt: new Date(),
            errorMessage: null,
          },
        });

        // The DB state is already terminal, so a cleanup failure must not
        // re-run an expensive optimization job. Staging files are safe to
        // remove after publication.
        await this.cleanupProcessedSource(job.productFileId).catch((error) => {
          this.logger.error(
            `Unable to clean optimized source ${job.productFileId}`,
            error instanceof Error ? error.stack : String(error),
          );
        });

        return;
      } else {
        await this.prisma.productFile.update({
          where: { id: job.productFileId },
          data: {
            processingStatus: ProcessingStatus.COMPLETED,
            processingError: null,
          },
        });
      }

      await this.prisma.productFileProcessingJob.update({
        where: { id: job.id },
        data: {
          status: ProcessingJobStatus.COMPLETED,
          completedAt: new Date(),
          errorMessage: null,
        },
      });

      this.logger.log(
        `Processing job ${job.id} completed successfully`,
      );

    } catch (error) {
      await this.handleProcessingFailure(
        job,
        error,
      );
    }
  }

  /**
   * Remove a successfully processed GLB source.
   *
   * Storage deletion is intentionally attempted before the DB row is removed.
   * The operation is idempotent: a missing object is treated as already
   * cleaned, while a DB delete can safely be retried if the process restarts.
   */
  private async cleanupProcessedSource(productFileId: string): Promise<void> {
    const source = await this.prisma.productFile.findUnique({
      where: { id: productFileId },
      select: { id: true, storageKey: true },
    });

    // The source row may already be gone after a previous successful cleanup.
    if (!source) return;

    try {
      await this.storage.delete(source.storageKey);
    } catch (error) {
      this.logger.error(
        `Unable to delete processed source ${source.id} from storage; cleanup will be retried.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(
        "Unable to delete processed source from storage: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    try {
      await this.prisma.productFile.delete({ where: { id: source.id } });
      this.logger.log(`Removed original source ${source.id} after GLB conversion`);
    } catch (error) {
      throw new Error(
        "Source storage was deleted but source DB cleanup failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * Handle processing failure and retries.
   */
  private async handleProcessingFailure(
    job: {
      id: string;
      productFileId: string;
      attempts: number;
      maxAttempts: number;
    },
    error: unknown,
  ): Promise<void> {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown processing error";

    this.logger.error(
      `Processing job ${job.id} failed ` +
        `(attempt ${job.attempts}/${job.maxAttempts}): ` +
        errorMessage,
    );

    const shouldRetry =
      job.attempts < job.maxAttempts;

    if (shouldRetry) {
      await this.prisma.productFile.update({
        where: {
          id: job.productFileId,
        },
        data: {
          processingStatus:
            ProcessingStatus.PENDING,
          processingError: errorMessage,
        },
      });

      await this.prisma.productFileProcessingJob.update(
        {
          where: {
            id: job.id,
          },
          data: {
            status:
              ProcessingJobStatus.QUEUED,
            errorMessage,
            completedAt: null,
            startedAt: null,
          },
        },
      );

      this.logger.warn(
        `Processing job ${job.id} re-queued ` +
          `(next attempt ${job.attempts + 1}/${job.maxAttempts})`,
      );

      return;
    }

    await this.prisma.productFile.update({
      where: {
        id: job.productFileId,
      },
      data: {
        processingStatus:
          ProcessingStatus.FAILED,
        processingError: errorMessage,
      },
    });

    await this.prisma.productFileProcessingJob.update(
      {
        where: {
          id: job.id,
        },
        data: {
          status:
            ProcessingJobStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
        },
      },
    );

    this.logger.error(
      `Processing job ${job.id} permanently failed ` +
        `after ${job.maxAttempts} attempts`,
    );
  }

  /**
   * Recover jobs that were interrupted by a
   * backend restart or crash.
   */
  private async recoverStaleJobs(): Promise<void> {
    const staleBefore = new Date(
      Date.now() - this.staleAfterMs,
    );

    const staleJobs =
      await this.prisma.productFileProcessingJob.findMany(
        {
          where: {
            status:
              ProcessingJobStatus.PROCESSING,
            startedAt: {
              lt: staleBefore,
            },
          },
          select: {
            id: true,
            productFileId: true,
            attempts: true,
            maxAttempts: true,
          },
          take: 100,
        },
      );

    if (staleJobs.length === 0) {
      return;
    }

    this.logger.warn(
      `Found ${staleJobs.length} stale processing job(s)`,
    );

    for (const job of staleJobs) {
      const canRetry =
        job.attempts < job.maxAttempts;

      const recoveryMessage =
        "Processing worker restarted after an interrupted attempt.";

      if (canRetry) {
        const result =
          await this.prisma.productFileProcessingJob.updateMany(
            {
              where: {
                id: job.id,
                status:
                  ProcessingJobStatus.PROCESSING,
              },
              data: {
                status:
                  ProcessingJobStatus.QUEUED,
                errorMessage:
                  recoveryMessage,
                completedAt: null,
                startedAt: null,
              },
            },
          );

        if (result.count === 1) {
          await this.prisma.productFile.update({
            where: {
              id: job.productFileId,
            },
            data: {
              processingStatus:
                ProcessingStatus.PENDING,
              processingError:
                recoveryMessage,
            },
          });

          this.logger.warn(
            `Recovered stale job ${job.id} for retry`,
          );
        }

        continue;
      }

      const result =
        await this.prisma.productFileProcessingJob.updateMany(
          {
            where: {
              id: job.id,
              status:
                ProcessingJobStatus.PROCESSING,
            },
            data: {
              status:
                ProcessingJobStatus.FAILED,
              errorMessage:
                "Processing worker stopped during the final allowed attempt.",
              completedAt: new Date(),
            },
          },
        );

      if (result.count === 1) {
        await this.prisma.productFile.update({
          where: {
            id: job.productFileId,
          },
          data: {
            processingStatus:
              ProcessingStatus.FAILED,
            processingError:
              "Processing worker stopped during the final allowed attempt.",
          },
        });

        this.logger.error(
          `Marked stale job ${job.id} as permanently failed`,
        );
      }
    }
  }

  /**
   * Manual worker endpoint.
   *
   * Useful for development/testing.
   */
  async processNextJob() {
    const job =
      await this.claimNextJob();

    if (!job) {
      this.logger.log(
        "No queued processing jobs found.",
      );

      return null;
    }

    await this.processClaimedJob(
      job,
    );

    return this.prisma.productFileProcessingJob.findUnique(
      {
        where: {
          id: job.id,
        },
        include: {
          productFile: true,
          outputFile: true,
        },
      },
    );
  }

  /**
   * Dispatch file to the correct processor.
   */
  private async processFile(
    productFile: any,
    jobId: string,
  ): Promise<void> {
    if (!(await this.storage.exists(productFile.storageKey))) {
      throw new Error(
        `Storage file not found: ${productFile.storageKey}`,
      );
    }

    const tempDir = join("/tmp", "product-file-processing", randomUUID());
    const tempPath = join(
      tempDir,
      productFile.originalName?.replace(/[^a-zA-Z0-9._-]/g, "-") || "source",
    );

    await fs.mkdir(tempDir, { recursive: true });

    try {
      if (productFile.fileType === ProductFileType.MODEL ||
          (productFile.fileType === ProductFileType.DOCUMENT && productFile.format === ProductFileFormat.PDF)) {
        // ModelConversionService performs file-level validation after streaming
        // the source to disk, avoiding a second in-memory copy.
      } else {
        const buffer = await this.storage.read(productFile.storageKey);
        await fs.writeFile(tempPath, buffer);
        await this.contentValidator.validate(productFile.format, buffer);
      }

      if (productFile.fileType === ProductFileType.IMAGE) {
        switch (productFile.format) {
          case ProductFileFormat.PNG:
          case ProductFileFormat.JPG:
          case ProductFileFormat.JPEG:
          case ProductFileFormat.WEBP: {
            const metadata =
              await this.imageProcessingService.validateRasterImage(tempPath);

            await this.prisma.productFile.update({
              where: { id: productFile.id },
              data: {
                imageWidth: metadata.width,
                imageHeight: metadata.height,
                imageChannels: metadata.channels,
                imageHasAlpha: metadata.hasAlpha,
                imageColorSpace: metadata.space ?? null,
              },
            });
            return;
          }

          case ProductFileFormat.SVG:
            await this.imageProcessingService.validateSvg(tempPath);
            return;

          default:
            throw new Error(
              `Unsupported image format: ${productFile.format}`,
            );
        }
      }

      if (productFile.fileType === ProductFileType.DOCUMENT) {
        if (productFile.format === ProductFileFormat.PDF) {
          throw new Error("PDF/model conversion has been removed from the product-file pipeline.");
        }

        await this.processingJobs2DWorker.processFile(productFile);
        return;
      }

      if (productFile.fileType === ProductFileType.MODEL) {
        await this.optimizeGlbModel(productFile, jobId, tempPath);
        return;
      }

      throw new Error(
        `Unsupported product file type: ${productFile.fileType}`,
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async optimizeGlbModel(
    productFile: any,
    jobId: string,
    sourcePath: string,
  ): Promise<void> {
    if (productFile.format !== ProductFileFormat.GLB) {
      throw new Error("Only GLB models can enter the web optimization pipeline.");
    }

    const job = await this.prisma.productFileProcessingJob.findUnique({
      where: { id: jobId },
      select: { outputFileId: true },
    });

    if (job?.outputFileId) return;

    await this.storage.downloadTo(productFile.storageKey, sourcePath);

    const sourceStats = await fs.stat(sourcePath);
    const header = Buffer.alloc(12);
    const sourceHandle = await fs.open(sourcePath, "r");
    try {
      const { bytesRead } = await sourceHandle.read(header, 0, header.length, 0);
      if (
        bytesRead !== 12 ||
        header.toString("ascii", 0, 4) !== "glTF" ||
        header.readUInt32LE(4) !== 2 ||
        header.readUInt32LE(8) !== sourceStats.size
      ) {
        throw new Error("Source GLB failed structural validation.");
      }
    } finally {
      await sourceHandle.close();
    }

    const previousMedia = await this.prisma.productMedia.findFirst({
      where: {
        productId: productFile.productId,
        type: "MODEL_PREVIEW",
      },
      select: { url: true },
    });

    const optimizedPath = sourcePath.replace(/\.glb$/i, ".optimized.glb");
    const timeoutMs = Math.max(
      60_000,
      Number(process.env.MODEL_OPTIMIZATION_TIMEOUT_MS ?? 10 * 60_000),
    );

    await execFileAsync(
      "gltf-transform",
      [
        "optimize",
        sourcePath,
        optimizedPath,
        "--compress",
        "meshopt",
        "--texture-compress",
        "webp",
        "--texture-size",
        String(Number(process.env.MODEL_TEXTURE_MAX_SIZE ?? 2048)),
      ],
      {
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
      },
    );

    const optimizedStats = await fs.stat(optimizedPath);
    if (optimizedStats.size >= sourceStats.size) {
      this.logger.log(
        `Optimization kept original ${productFile.id}: ${sourceStats.size} -> ${optimizedStats.size} bytes`,
      );
      return;
    }

    const optimizedBuffer = await fs.readFile(optimizedPath);
    const output = await this.storage.saveProductFile({
      productId: productFile.productId,
      filename: "optimized-model.glb",
      buffer: optimizedBuffer,
    });

    if (!output.storageUrl) {
      await this.storage.delete(output.storageKey).catch(() => undefined);
      throw new Error("Optimized model has no public storage URL.");
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const file = await tx.productFile.create({
          data: {
            productId: productFile.productId,
            originalName: productFile.originalName || "model.glb",
            storageKey: output.storageKey,
            storageUrl: output.storageUrl,
            format: ProductFileFormat.GLB,
            fileType: ProductFileType.MODEL,
            mimeType: "model/gltf-binary",
            fileSize: BigInt(optimizedStats.size),
            processingStatus: ProcessingStatus.COMPLETED,
            convertedFromId: productFile.id,
          },
        });

        await tx.productMedia.deleteMany({
          where: {
            productId: productFile.productId,
            type: "MODEL_PREVIEW",
          },
        });

        await tx.productMedia.create({
          data: {
            productId: productFile.productId,
            type: "MODEL_PREVIEW",
            url: output.storageUrl!,
            altText: productFile.originalName || "GLB model",
            sortOrder: 0,
            isPrimary: true,
          },
        });

        await tx.productFileProcessingJob.update({
          where: { id: jobId },
          data: { outputFileId: file.id },
        });

        return file;
      });
 
      this.logger.log(
        `Published optimized model ${created.id}: ${sourceStats.size} -> ${optimizedStats.size} bytes`,
      );

      const replacedFiles = await this.prisma.productFile.findMany({
        where: {
          productId: productFile.productId,
          fileType: ProductFileType.MODEL,
          format: ProductFileFormat.GLB,
          id: { notIn: [productFile.id, created.id] },
          ...(previousMedia?.url
            ? { storageUrl: previousMedia.url }
            : { id: "__no_previous_model__" }),
        },
        select: { id: true, storageKey: true },
      });

      for (const replaced of replacedFiles) {
        await this.storage.delete(replaced.storageKey).catch((error) => {
          this.logger.warn(
            `Unable to delete replaced model ${replaced.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

        await this.prisma.productFile.delete({
          where: { id: replaced.id },
        }).catch((error) => {
          this.logger.warn(
            `Unable to delete replaced model row ${replaced.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    } catch (error) {
      await this.storage.delete(output.storageKey).catch(() => undefined);
      throw error;
    }
  }

}