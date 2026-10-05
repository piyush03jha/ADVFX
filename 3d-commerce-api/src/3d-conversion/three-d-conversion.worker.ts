import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ProcessingJobStatus } from "@prisma/client";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ThreeDConversionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThreeDConversionWorker.name);
  private readonly pollIntervalMs = this.positive(process.env.CONVERSION_WORKER_POLL_INTERVAL_MS, 2000);
  private readonly concurrency = Math.max(1, Math.min(2, Math.floor(this.positive(process.env.CONVERSION_WORKER_CONCURRENCY, 1))));
  private readonly staleAfterMs = this.positive(process.env.CONVERSION_WORKER_STALE_AFTER_MS, 2 * 60 * 60 * 1000);
  private readonly timeoutMs = this.positive(process.env.CONVERSION_TIMEOUT_MS, 5 * 60 * 1000);
  private running = false;
  private loop: Promise<void> | null = null;
  private active = 0;

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private positive(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  onModuleInit() {
    if (process.env.CONVERSION_WORKER_ENABLED !== "true") {
      this.logger.log("3D conversion worker disabled by CONVERSION_WORKER_ENABLED");
      return;
    }
    if (this.running) return;
    this.running = true;
    this.loop = this.runLoop();
    this.logger.log("3D conversion worker started");
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.loop) await this.loop;
  }

  private async runLoop() {
    while (this.running) {
      try {
        await this.recoverStaleJobs();
        while (this.running && this.active < this.concurrency) {
          const job = await this.claimNextJob();
          if (!job) break;
          this.active += 1;
          void this.process(job).finally(() => { this.active -= 1; });
        }
      } catch (error) {
        this.logger.error("Conversion worker loop error", error instanceof Error ? error.stack : String(error));
      }
      if (this.running) await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
    while (this.active > 0) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async claimNextJob() {
    const candidate = await this.prisma.threeDConversionJob.findFirst({
      where: { status: ProcessingJobStatus.QUEUED },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!candidate) return null;

    const claimed = await this.prisma.threeDConversionJob.updateMany({
      where: { id: candidate.id, status: ProcessingJobStatus.QUEUED },
      data: {
        status: ProcessingJobStatus.PROCESSING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        errorMessage: null,
      },
    });
    if (claimed.count !== 1) return null;

    return this.prisma.threeDConversionJob.findUnique({ where: { id: candidate.id } });
  }

  private async process(job: NonNullable<Awaited<ReturnType<ThreeDConversionWorker["claimNextJob"]>>>) {
    if (!job) return;
    const tempDir = join("/tmp", "voxel3d-conversion", randomUUID());
    const sourcePath = join(tempDir, "source" + job.inputExt);
    const outputPath = join(tempDir, "output.glb");

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await this.storage.downloadTo(job.sourceStorageKey, sourcePath);
      await this.runBlender(sourcePath, outputPath, job.inputExt);
      await this.validateGlb(outputPath);

      const outputKey = "conversions/" + job.id + "/output/model.glb";
      const outputSize = await this.storage.uploadFileFromPath(outputKey, outputPath, "model/gltf-binary");

      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          status: ProcessingJobStatus.COMPLETED,
          outputStorageKey: outputKey,
          outputSize: BigInt(outputSize),
          errorMessage: null,
          completedAt: new Date(),
        },
      });
      this.logger.log("Converted " + job.id + " to GLB");
    } catch (error) {
      await this.handleFailure(job.id, error);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async handleFailure(id: string, error: unknown) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 4000);
    const current = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!current) return;

    const terminal = current.attempts >= current.maxAttempts;
    await this.prisma.threeDConversionJob.update({
      where: { id },
      data: {
        status: terminal ? ProcessingJobStatus.FAILED : ProcessingJobStatus.QUEUED,
        errorMessage: message,
        completedAt: terminal ? new Date() : null,
        startedAt: null,
      },
    });
    this.logger.error("Conversion job " + id + " failed: " + message);
  }

  private async recoverStaleJobs() {
    const cutoff = new Date(Date.now() - this.staleAfterMs);
    await this.prisma.threeDConversionJob.updateMany({
      where: {
        status: ProcessingJobStatus.PROCESSING,
        startedAt: { lt: cutoff },
      },
      data: {
        status: ProcessingJobStatus.QUEUED,
        errorMessage: "Recovered stale conversion worker job",
        startedAt: null,
      },
    });
  }

  private async runBlender(sourcePath: string, outputPath: string, ext: string) {
    const blender = process.env.BLENDER_BIN || "blender";
    const script = join(process.cwd(), "scripts", "blender-convert.py");

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        blender,
        [
          "--background",
          "--factory-startup",
          "--python-exit-code",
          "1",
          "--python",
          script,
          "--",
          "--input",
          sourcePath,
          "--output",
          outputPath,
          "--ext",
          ext,
        ],
        { shell: false, stdio: ["ignore", "pipe", "pipe"] },
      );

      let stderr = "";
      let stdout = "";
      let settled = false;

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(new Error("Blender conversion timed out after " + this.timeoutMs + " ms"));
      }, this.timeoutMs);

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };

      child.stdout?.on("data", (chunk) => { stdout = (stdout + String(chunk)).slice(-12000); });
      child.stderr?.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-12000); });
      child.on("error", (error) => finish(error));
      child.on("close", (code, signal) => {
        if (code === 0) return finish();
        const details = (stderr || stdout || "").trim();
        finish(new Error(
          "Blender exited with " + (signal ? "signal " + signal : "code " + code) +
          (details ? ": " + details : ""),
        ));
      });
    });
  }

  private async validateGlb(path: string) {
    const stat = await fs.stat(path);
    if (stat.size < 20) throw new Error("Blender produced an empty or invalid GLB");
    const handle = await fs.open(path, "r");
    try {
      const header = Buffer.alloc(12);
      await handle.read(header, 0, 12, 0);
      if (header.toString("ascii", 0, 4) !== "glTF") throw new Error("Converted output is not a GLB");
      if (header.readUInt32LE(4) !== 2) throw new Error("Converted GLB is not version 2");
      if (header.readUInt32LE(8) !== stat.size) throw new Error("Converted GLB length does not match the file size");
    } finally {
      await handle.close();
    }
  }
}
