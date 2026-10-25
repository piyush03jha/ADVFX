import { ProcessingJobStatus } from "@prisma/client";
import { ThreeDConversionWorker } from "./three-d-conversion.worker";

describe("ThreeDConversionWorker recovery", () => {
  const prisma = {
    threeDConversionJob: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
  const storage = {} as any;
  const conversionService = { complete: jest.fn() } as any;
  let worker: ThreeDConversionWorker;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.threeDConversionJob.updateMany.mockResolvedValue({ count: 0 });
    prisma.threeDConversionJob.findMany.mockResolvedValue([]);
    conversionService.complete.mockResolvedValue({ status: ProcessingJobStatus.QUEUED });
    worker = new ThreeDConversionWorker(prisma, storage, conversionService);
  });

  it("requeues a stale job below max attempts and permanently fails one at max attempts", async () => {
    prisma.threeDConversionJob.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "stale-maxed", attempts: 3, maxAttempts: 3, stage: "CONVERTING" },
      ]);

    await (worker as any).recoverStaleJobs();

    expect(prisma.threeDConversionJob.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.threeDConversionJob.updateMany.mock.calls[1][0]).toMatchObject({
      where: {
        id: "stale-maxed",
        status: ProcessingJobStatus.PROCESSING,
        stage: "CONVERTING",
        attempts: 3,
      },
      data: {
        status: ProcessingJobStatus.FAILED,
        stage: "FAILED",
        startedAt: null,
      },
    });
  });

  it("retries a persisted multipart completion after an interrupted API process", async () => {
    const job = {
      id: "job-1",
      status: ProcessingJobStatus.PROCESSING,
      stage: "COMPLETING",
      sourceStorageKey: "conversions/job-1/source/model.obj",
      uploadId: "upload-1",
      completionSize: BigInt(1024),
      completionParts: [{ PartNumber: 1, ETag: "etag-1" }],
    };
    prisma.threeDConversionJob.findMany
      .mockResolvedValueOnce([job])
      .mockResolvedValueOnce([]);

    await (worker as any).recoverStaleJobs();

    expect(conversionService.complete).toHaveBeenCalledWith("job-1", {
      key: job.sourceStorageKey,
      uploadId: "upload-1",
      size: 1024,
      parts: [{ PartNumber: 1, ETag: "etag-1" }],
    });
  });
});
