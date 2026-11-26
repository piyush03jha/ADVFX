import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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


describe("quality-driven model optimization", () => {
  let dir: string;
  let worker: any;
  let source: string;
  let output: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "voxel-opt-test-"));
    source = join(dir, "source.glb");
    output = join(dir, "out.glb");
    await writeFile(source, Buffer.alloc(100));
    worker = new ThreeDConversionWorker({} as any, {} as any, {} as any);
    worker.validateGlb = jest.fn().mockResolvedValue(undefined);
    worker.runCli = jest.fn().mockImplementation(async () => { await writeFile(output, Buffer.alloc(40)); });
  });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
  it("runs Balanced exactly once and does not simplify", async () => {
    const result = await worker.optimizeModel(source, output, "BALANCED", false);
    expect(result).toEqual({ path: output, warning: null });
    expect(worker.runCli).toHaveBeenCalledTimes(1);
    const args = worker.runCli.mock.calls[0][0];
    expect(args[args.indexOf("--simplify") + 1]).toBe("false");
  });
  it("builds a smaller preview in one pass", async () => {
    expect(await worker.buildStorefrontPreview(source, output, 100, false)).toBe(true);
    const args = worker.runCli.mock.calls[0][0];
    expect(args[args.indexOf("--texture-size") + 1]).toBe("512");
    expect(args[args.indexOf("--simplify-ratio") + 1]).toBe("0.1");
    expect(worker.runCli).toHaveBeenCalledTimes(1);
  });
  it("rejects redundant previews and does not simplify animations", async () => {
    expect(await worker.buildStorefrontPreview(source, output, 45, true)).toBe(false);
    const args = worker.runCli.mock.calls[0][0];
    expect(args[args.indexOf("--simplify") + 1]).toBe("false");
  });
  it("never simplifies animation", async () => {
    await worker.optimizeModel(source, output, "SMALLEST", true);
    const args = worker.runCli.mock.calls[0][0];
    expect(args[args.indexOf("--simplify") + 1]).toBe("false");
  });
  it("keeps the converted model when compression fails", async () => {
    worker.runCli.mockRejectedValue(new Error("out of memory"));
    expect(await worker.optimizeModel(source, output, "BALANCED", false)).toMatchObject({path: source, warning: expect.stringContaining("could not complete")});
  });
  it("does not replace a smaller converted model with a larger result", async () => {
    worker.runCli.mockImplementation(async () => { await writeFile(output, Buffer.alloc(120)); });
    expect(await worker.optimizeModel(source, output, "BALANCED", false)).toMatchObject({path: source});
  });
});
