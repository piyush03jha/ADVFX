import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProcessingJobsService } from "./processing-jobs.service";

describe("ProcessingJobsService", () => {
  const productFile = { id: "file-1" };

  function makePrisma() {
    return {
      productFile: {
        findUnique: jest.fn(),
      },
      productFileProcessingJob: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as any;
  }

  it("returns the existing active job when one already exists", async () => {
    const prisma = makePrisma();
    const existingJob = {
      id: "job-1",
      productFileId: "file-1",
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      errorMessage: null,
      outputFileId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.productFile.findUnique.mockResolvedValue(productFile);
    prisma.productFileProcessingJob.findFirst.mockResolvedValue(existingJob);

    const service = new ProcessingJobsService(prisma);
    const result = await service.create("file-1");

    expect(result.id).toBe("job-1");
    expect(prisma.productFileProcessingJob.create).not.toHaveBeenCalled();
  });

  it("creates a queued job when no active job exists", async () => {
    const prisma = makePrisma();
    const createdJob = {
      id: "job-2",
      productFileId: "file-1",
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      errorMessage: null,
      outputFileId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.productFile.findUnique.mockResolvedValue(productFile);
    prisma.productFileProcessingJob.findFirst.mockResolvedValue(null);
    prisma.productFileProcessingJob.create.mockResolvedValue(createdJob);

    const service = new ProcessingJobsService(prisma);
    const result = await service.create("file-1");

    expect(result.id).toBe("job-2");
    expect(prisma.productFileProcessingJob.create).toHaveBeenCalledWith({
      data: {
        productFileId: "file-1",
        status: "QUEUED",
        attempts: 0,
        maxAttempts: 3,
      },
    });
  });

  it("returns the concurrent winner after a unique-constraint race", async () => {
    const prisma = makePrisma();
    const concurrentJob = {
      id: "job-winner",
      productFileId: "file-1",
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      errorMessage: null,
      outputFileId: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.productFile.findUnique.mockResolvedValue(productFile);
    prisma.productFileProcessingJob.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentJob);
    prisma.productFileProcessingJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "7.10.0",
        },
      ),
    );

    const service = new ProcessingJobsService(prisma);
    const result = await service.create("file-1");

    expect(result.id).toBe("job-winner");
  });

  it("throws ConflictException if a unique race occurs but no active job can be found", async () => {
    const prisma = makePrisma();

    prisma.productFile.findUnique.mockResolvedValue(productFile);
    prisma.productFileProcessingJob.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.productFileProcessingJob.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "7.10.0",
        },
      ),
    );

    const service = new ProcessingJobsService(prisma);

    await expect(service.create("file-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
