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

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { FileContentValidationService } from "../product-files/file-content-validation.service";
import { ProcessingJobs2DWorker } from "./processing-jobs-2d.worker";
import { ImageProcessingService } from "./image-processing.service";
import { ModelConverterService } from "./converters/model-converter.service";

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
        2,
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
    private readonly modelConverterService: ModelConverterService,
  ) {}

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

      await this.prisma.productFile.update({
        where: {
          id: job.productFileId,
        },
        data: {
          processingStatus:
            ProcessingStatus.COMPLETED,
          processingError: null,
        },
      });

      await this.prisma.productFileProcessingJob.update(
        {
          where: {
            id: job.id,
          },
          data: {
            status:
              ProcessingJobStatus.COMPLETED,
            completedAt: new Date(),
            errorMessage: null,
          },
        },
      );

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
   * Process 3D models.
   *
   * GLB:
   *   Already browser-ready, so no conversion.
   *
   * GLTF / OBJ / other supported formats:
   *   Convert to GLB using ModelConverterService.
   *
   * Bundled GLTF:
   *   Reconstruct the complete bundle in a temporary
   *   directory before invoking the converter.
   */
  private async process3DModel(
    jobId: string,
    productFile: {
      id: string;
      productId: string;
      originalName: string;
      format: ProductFileFormat;
      storageKey: string;
    },
  ): Promise<void> {
    const baseName =
      this.sanitizeBaseName(
        productFile.originalName,
      );

    const temporaryOutputKey =
      `products/${productFile.productId}/generated/tmp-${crypto.randomUUID()}-${baseName}.glb`;

    const outputPath =
      this.storage.getAbsolutePath(
        temporaryOutputKey,
      );

    let temporaryInputDirectory:
      string | null = null;

    let inputPath =
      this.storage.getAbsolutePath(
        productFile.storageKey,
      );

    try {
      /**
       * ----------------------------------------------------------
       * CHECK WHETHER THIS PRODUCT FILE BELONGS TO A BUNDLE
       * ----------------------------------------------------------
       *
       * ProductFileBundle.rootFileId is unique, so findUnique
       * is safe here.
       */
      const bundle =
        await this.prisma.productFileBundle.findUnique(
          {
            where: {
              rootFileId:
                productFile.id,
            },
            include: {
              assets: {
                orderBy: {
                  relativePath:
                    "asc",
                },
              },
            },
          },
        );

      if (bundle) {
        temporaryInputDirectory =
          await this.prepareBundleInput(
            productFile,
            bundle.assets,
          );

        inputPath =
          path.join(
            temporaryInputDirectory,
            path.basename(
              productFile.originalName,
            ),
          );

        this.logger.log(
          `Prepared 3D bundle ` +
            `${bundle.id} with ` +
            `${bundle.assets.length} dependency asset(s)`,
        );
      }

      this.logger.log(
        `Converting ${productFile.originalName} ` +
          `(${productFile.format}) to GLB`,
      );

      const result =
        await this.modelConverterService.convert(
          productFile.format,
          inputPath,
          outputPath,
        );

      const generatedBuffer =
        await fs.readFile(
          result.outputPath,
        );

      if (generatedBuffer.length === 0) {
        throw new Error(
          "3D converter generated an empty file",
        );
      }

      /**
       * Validate generated GLB before storing it.
       */
      await this.contentValidator.validate(
        ProductFileFormat.GLB,
        generatedBuffer,
      );

      const outputFileName =
        `${baseName}.glb`;

      const stored =
        await this.storage.saveGeneratedFile(
          generatedBuffer,
          productFile.productId,
          outputFileName,
        );

      const outputFile =
        await this.prisma.productFile.create({
          data: {
            productId:
              productFile.productId,

            originalName:
              outputFileName,

            storageKey:
              stored.storageKey,

            storageUrl:
              stored.storageUrl,

            format:
              ProductFileFormat.GLB,

            fileType:
              ProductFileType.MODEL,

            mimeType:
              "model/gltf-binary",

            fileSize:
              BigInt(stored.size),

            processingStatus:
              ProcessingStatus.COMPLETED,

            processingError: null,

            convertedFromId:
              productFile.id,
          },
        });

      await this.prisma.productFileProcessingJob.update({
        where: {
          id: jobId,
        },
        data: {
          outputFileId:
            outputFile.id,
        },
      });

      this.logger.log(
        `3D conversion completed: ` +
          `${productFile.originalName} -> ${outputFileName}`,
      );
    } finally {
      /**
       * Remove temporary converter output.
       */
      await fs.rm(
        outputPath,
        {
          force: true,
        },
      );

      /**
       * Remove reconstructed bundle input.
       */
      if (temporaryInputDirectory) {
        await fs.rm(
          temporaryInputDirectory,
          {
            recursive: true,
            force: true,
          },
        );
      }
    }
  }

  /**
   * Reconstruct a ProductFileBundle into a temporary
   * filesystem directory.
   *
   * Example:
   *
   * temporary/
   *   IronMan.gltf
   *   buffer.bin
   *   textures/
   *     body.jpg
   *
   * This is required because GLTF commonly references
   * external files through relative URIs.
   */
  private async prepareBundleInput(
    productFile: {
      id: string;
      originalName: string;
      storageKey: string;
    },
    assets: Array<{
      id: string;
      relativePath: string;
      storageKey: string;
      originalName: string;
      mimeType: string | null;
      fileSize: bigint;
    }>,
  ): Promise<string> {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "advfx-bundle-",
        ),
      );

    try {
      /**
       * ----------------------------------------------------------
       * WRITE ROOT GLTF
       * ----------------------------------------------------------
       */
      const rootSourcePath =
        this.storage.getAbsolutePath(
          productFile.storageKey,
        );

      const rootFileName =
        path.basename(
          productFile.originalName,
        );

      const rootDestination =
        path.join(
          temporaryDirectory,
          rootFileName,
        );

      await fs.copyFile(
        rootSourcePath,
        rootDestination,
      );

      /**
       * ----------------------------------------------------------
       * WRITE DEPENDENCY ASSETS
       * ----------------------------------------------------------
       */
      for (const asset of assets) {
        const relativePath =
          this.normalizeTemporaryRelativePath(
            asset.relativePath,
          );

        if (!relativePath) {
          throw new Error(
            `Bundle asset has an invalid relative path: ${asset.relativePath}`,
          );
        }

        const sourcePath =
          this.storage.getAbsolutePath(
            asset.storageKey,
          );

        if (
          !(await this.storage.exists(
            asset.storageKey,
          ))
        ) {
          throw new Error(
            `Bundle dependency file not found: ${asset.storageKey}`,
          );
        }

        const destinationPath =
          this.resolveInsideDirectory(
            temporaryDirectory,
            relativePath,
          );

        await fs.mkdir(
          path.dirname(
            destinationPath,
          ),
          {
            recursive: true,
          },
        );

        await fs.copyFile(
          sourcePath,
          destinationPath,
        );
      }

      return temporaryDirectory;
    } catch (error) {
      await fs.rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        },
      );

      throw error;
    }
  }

  /**
   * Normalize and validate a relative bundle path.
   *
   * This intentionally rejects absolute paths and traversal.
   */
  private normalizeTemporaryRelativePath(
    value: string,
  ): string {
    const normalized =
      value
        .replace(
          /\\/g,
          "/",
        )
        .trim();

    if (!normalized) {
      return "";
    }

    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(
        normalized,
      )
    ) {
      return "";
    }

    const segments =
      normalized.split("/");

    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === "..",
      )
    ) {
      return "";
    }

    return segments.join(
      path.sep,
    );
  }

  /**
   * Resolve a relative path while guaranteeing that
   * the result remains inside the temporary directory.
   */
  private resolveInsideDirectory(
    directory: string,
    relativePath: string,
  ): string {
    const root =
      path.resolve(directory);

    const resolved =
      path.resolve(
        root,
        relativePath,
      );

    const relative =
      path.relative(
        root,
        resolved,
      );

    if (
      relative === ".." ||
      relative.startsWith(
        `..${path.sep}`,
      ) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(
        `Unsafe bundle dependency path: ${relativePath}`,
      );
    }

    return resolved;
  }

  /**
   * Remove unsafe characters from generated filename.
   */
  private sanitizeBaseName(
    fileName: string,
  ): string {
    const base =
      fileName
        .replace(
          /\.[^/.]+$/,
          "",
        )
        .replace(
          /[^a-zA-Z0-9._-]+/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        )
        .replace(
          /^-|-$/g,
          "",
        )
        .slice(0, 120);

    return base || "model";
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
    if (
      !(await this.storage.exists(
        productFile.storageKey,
      ))
    ) {
      throw new Error(
        `Storage file not found: ${productFile.storageKey}`,
      );
    }

    const absolutePath =
      this.storage.getAbsolutePath(
        productFile.storageKey,
      );

    const buffer =
      await fs.readFile(
        absolutePath,
      );

    /**
     * Validate uploaded content before processing.
     */
    await this.contentValidator.validate(
      productFile.format,
      buffer,
    );

    // -------------------------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------------------------

    if (
      productFile.fileType ===
      ProductFileType.IMAGE
    ) {
      switch (productFile.format) {
        case ProductFileFormat.PNG:
        case ProductFileFormat.JPG:
        case ProductFileFormat.JPEG:
        case ProductFileFormat.WEBP: {
          const metadata =
            await this.imageProcessingService.validateRasterImage(
              absolutePath,
            );

          await this.prisma.productFile.update({
            where: {
              id: productFile.id,
            },
            data: {
              imageWidth:
                metadata.width,

              imageHeight:
                metadata.height,

              imageChannels:
                metadata.channels,

              imageHasAlpha:
                metadata.hasAlpha,

              imageColorSpace:
                metadata.space ?? null,
            },
          });

          return;
        }

        case ProductFileFormat.SVG:
          await this.imageProcessingService.validateSvg(
            absolutePath,
          );

          return;

        default:
          throw new Error(
            `Unsupported image format: ${productFile.format}`,
          );
      }
    }

    // -------------------------------------------------------------------------
    // DOCUMENT
    // -------------------------------------------------------------------------

    if (
      productFile.fileType ===
      ProductFileType.DOCUMENT
    ) {
      await this.processingJobs2DWorker.processFile(
        productFile,
      );

      return;
    }

    // -------------------------------------------------------------------------
    // MODEL
    // -------------------------------------------------------------------------

    if (
      productFile.fileType ===
      ProductFileType.MODEL
    ) {
      /**
       * GLB is already the preferred web format.
       */
      if (
        productFile.format ===
        ProductFileFormat.GLB
      ) {
        return;
      }

      /**
       * Convert every non-GLB model through
       * ModelConverterService.
       *
       * process3DModel() additionally detects whether
       * this ProductFile is the root of a dependency
       * bundle.
       */
      await this.process3DModel(
        jobId,
        {
          id: productFile.id,
          productId:
            productFile.productId,
          originalName:
            productFile.originalName,
          format:
            productFile.format,
          storageKey:
            productFile.storageKey,
        },
      );

      return;
    }

    throw new Error(
      `Unsupported product file type: ${productFile.fileType}`,
    );
  }

  private getPositiveNumber(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed =
      Number(value);

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return parsed;
  }

  private sleep(
    milliseconds: number,
  ): Promise<void> {
    return new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds,
        );
      },
    );
  }
}