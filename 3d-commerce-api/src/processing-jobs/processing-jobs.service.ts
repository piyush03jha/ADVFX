import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  ProcessingJobStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProcessingJobsService {
  private static readonly DEFAULT_MAX_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create the single active processing job for a ProductFile.
   *
   * The database partial unique index is the authoritative concurrency
   * guard. Only one QUEUED/PROCESSING job can exist for a file.
   */
  async create(productFileId: string) {
    const normalizedId = productFileId?.trim();

    if (!normalizedId) {
      throw new BadRequestException(
        "productFileId is required",
      );
    }

    const productFile =
      await this.prisma.productFile.findUnique({
        where: {
          id: normalizedId,
        },
        select: {
          id: true,
        },
      });

    if (!productFile) {
      throw new NotFoundException(
        `Product file "${normalizedId}" not found`,
      );
    }

    const existingJob =
      await this.prisma.productFileProcessingJob.findFirst({
        where: {
          productFileId: normalizedId,
          status: {
            in: [
              ProcessingJobStatus.QUEUED,
              ProcessingJobStatus.PROCESSING,
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingJob) {
      return this.serializeJob(existingJob);
    }

    try {
      const job =
        await this.prisma.productFileProcessingJob.create({
          data: {
            productFileId: normalizedId,
            status: ProcessingJobStatus.QUEUED,
            attempts: 0,
            maxAttempts:
              ProcessingJobsService.DEFAULT_MAX_ATTEMPTS,
          },
        });

      return this.serializeJob(job);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const concurrentJob =
          await this.prisma.productFileProcessingJob.findFirst({
            where: {
              productFileId: normalizedId,
              status: {
                in: [
                  ProcessingJobStatus.QUEUED,
                  ProcessingJobStatus.PROCESSING,
                ],
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (concurrentJob) {
          return this.serializeJob(concurrentJob);
        }
      }

      throw new ConflictException(
        "Unable to create processing job safely",
      );
    }
  }

  /**
   * Get all processing jobs.
   */
  async findAll() {
    const jobs =
      await this.prisma.productFileProcessingJob.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          productFile: {
            select: this.productFileSelect(),
          },
          outputFile: {
            select: this.productFileSelect(),
          },
        },
      });

    return jobs.map((job) =>
      this.serializeJob(job),
    );
  }

  /**
   * Get one processing job.
   */
  async findOne(id: string) {
    const normalizedId = id?.trim();

    if (!normalizedId) {
      throw new BadRequestException(
        "Processing job id is required",
      );
    }

    const job =
      await this.prisma.productFileProcessingJob.findUnique({
        where: {
          id: normalizedId,
        },
        include: {
          productFile: {
            select: this.productFileSelect(),
          },
          outputFile: {
            select: this.productFileSelect(),
          },
        },
      });

    if (!job) {
      throw new NotFoundException(
        `Processing job "${normalizedId}" not found`,
      );
    }

    return this.serializeJob(job);
  }

  private productFileSelect(): Prisma.ProductFileSelect {
    return {
      id: true,
      productId: true,
      originalName: true,
      storageKey: true,
      storageUrl: true,
      format: true,
      fileType: true,
      mimeType: true,
      fileSize: true,
      processingStatus: true,
      processingError: true,
      convertedFromId: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private serializeJob(job: any) {
    return {
      id: job.id,
      productFileId: job.productFileId,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      errorMessage: job.errorMessage,
      outputFileId: job.outputFileId,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      productFile: job.productFile
        ? this.serializeProductFile(job.productFile)
        : null,
      outputFile: job.outputFile
        ? this.serializeProductFile(job.outputFile)
        : null,
    };
  }

  private serializeProductFile(file: any) {
    return {
      id: file.id,
      productId: file.productId,
      originalName: file.originalName,
      storageKey: file.storageKey,
      storageUrl: file.storageUrl,
      format: file.format,
      fileType: file.fileType,
      mimeType: file.mimeType,
      fileSize: file.fileSize?.toString() ?? null,
      processingStatus: file.processingStatus,
      processingError: file.processingError,
      convertedFromId: file.convertedFromId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
