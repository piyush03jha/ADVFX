import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ProcessingJobStatus } from "@prisma/client";
import { promises as fs } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ThreeDConversionService } from "./three-d-conversion.service";

const execFileAsync = promisify(execFile);
const TARGET_MAX_BYTES = 8 * 1024 * 1024;

type OptimizationPreset = "BALANCED" | "SMALLEST";

@Injectable()
export class ThreeDConversionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThreeDConversionWorker.name);
  private readonly pollIntervalMs = this.positive(process.env.CONVERSION_WORKER_POLL_INTERVAL_MS, 2000);
  private readonly concurrency = 1;
  private readonly staleAfterMs = this.positive(process.env.CONVERSION_WORKER_STALE_AFTER_MS, 2 * 60 * 60 * 1000);
  private readonly timeoutMs = this.positive(process.env.CONVERSION_TIMEOUT_MS, 10 * 60 * 1000);
  private readonly optimizeTimeoutMs = this.positive(process.env.MODEL_OPTIMIZATION_TIMEOUT_MS, 10 * 60 * 1000);
  private running = false;
  private loop: Promise<void> | null = null;
  private active = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly conversionService: ThreeDConversionService,
  ) {}

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
    this.logger.log("3D conversion worker started (concurrency=1)");
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
        this.logger.error(
          "Conversion worker loop error",
          error instanceof Error ? error.stack : String(error),
        );
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
        stage: "CONVERTING",
        attempts: { increment: 1 },
        startedAt: new Date(),
        completedAt: null,
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
    const convertedPath = join(tempDir, "converted.glb");
    const optimizedPaths = [
      join(tempDir, "optimized-1.glb"),
      join(tempDir, "optimized-2.glb"),
      join(tempDir, "optimized-3.glb"),
    ];

    try {
      await fs.mkdir(tempDir, { recursive: true });

      const reusableConverted = Boolean(
        job.convertedStorageKey && (await this.storage.exists(job.convertedStorageKey)),
      );
      const sourceKey = reusableConverted ? job.convertedStorageKey! : job.sourceStorageKey;
      const originalSize = job.originalSize ? Number(job.originalSize) : await this.storage.getObjectSize(sourceKey);
      await this.storage.downloadTo(sourceKey, sourcePath);

      let animationCount = 0;

      const blenderInput =
        job.inputExt === ".zip"
          ? await this.prepareBlenderInput(sourcePath, job.inputExt, tempDir)
          : { path: sourcePath, ext: job.inputExt };

      if (reusableConverted || blenderInput.ext === ".glb") {
        await fs.copyFile(blenderInput.path, convertedPath);
        await this.validateGlb(convertedPath);
      } else {
        await this.runBlender(blenderInput.path, convertedPath, blenderInput.ext);
        await this.validateGlb(convertedPath);
      }

      await this.inspectGlb(convertedPath);
      animationCount = await this.hasAnimations(convertedPath) ? 1 : 0;

      const convertedSize = (await fs.stat(convertedPath)).size;
      const directGlbSource = job.inputExt === ".glb" && !reusableConverted;
      const convertedKey = directGlbSource
        ? job.sourceStorageKey
        : "conversions/" + job.id + "/converted/model.glb";

      if (!directGlbSource) {
        await this.storage.uploadFileFromPath(convertedKey, convertedPath, "model/gltf-binary");
      }

      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          originalSize: BigInt(originalSize),
          convertedStorageKey: convertedKey,
          convertedSize: BigInt(convertedSize),
          stage: "OPTIMIZING",
        },
      });

      const preset: OptimizationPreset =
        job.optimizationPreset === "SMALLEST" ? "SMALLEST" : "BALANCED";
      const candidate = await this.optimizeTiers(
        convertedPath,
        optimizedPaths,
        preset,
        animationCount > 0,
      );

      await this.validateGlb(candidate.path);
      await this.inspectGlb(candidate.path);

      const optimizedSize = (await fs.stat(candidate.path)).size;
      const outputKey = "conversions/" + job.id + "/output/model.glb";
      await this.storage.uploadFileFromPath(outputKey, candidate.path, "model/gltf-binary");

      const warning =
        candidate.warning ??
        (optimizedSize > TARGET_MAX_BYTES
          ? `Optimized model is ${Math.round(optimizedSize / 1024 / 1024)} MB; it remains above the preferred 8 MB web target.`
          : null);

      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          status: ProcessingJobStatus.COMPLETED,
          stage: "READY",
          outputStorageKey: outputKey,
          outputSize: BigInt(optimizedSize),
          optimizerWarning: warning,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      // Keep a direct GLB source until publish because convertedStorageKey points
      // at that same object. Other formats can discard their private source once
      // the converted GLB is durable.
      if (job.deleteSourceOnSuccess && !reusableConverted && !directGlbSource) {
        await this.storage.delete(job.sourceStorageKey).catch((error) => {
          this.logger.warn(
            `Unable to delete original conversion source ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }

      if (job.targetProductId) {
        try {
          await this.conversionService.publish(job.id, job.targetProductId);
        } catch (error) {
          await this.prisma.threeDConversionJob.update({
            where: { id: job.id },
            data: {
              stage: "READY",
              errorMessage: `Publish failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
          this.logger.error(
            `Automatic publish failed for ${job.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log(
        `3D conversion job ${job.id} ready: ${originalSize} -> ${optimizedSize} bytes`,
      );
    } catch (error) {
      await this.handleFailure(job.id, error);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async optimizeTiers(
    inputPath: string,
    outputPaths: string[],
    preset: OptimizationPreset,
    hasAnimations: boolean,
  ) {
    const textureSizes = preset === "SMALLEST" ? [768, 768, 512] : [1024, 1024, 512];
    const target = preset === "SMALLEST" ? 5.5 * 1024 * 1024 : TARGET_MAX_BYTES;
    const simplifyRatios = hasAnimations ? [null, null, null] : [null, 0.5, 0.3];

    let best = inputPath;
    let bestSize = (await fs.stat(inputPath)).size;
    let warning: string | null = hasAnimations ? "Animation detected; mesh simplification was disabled." : null;

    for (let i = 0; i < outputPaths.length; i += 1) {
      const output = outputPaths[i];
      const ratio = simplifyRatios[i];
      const args = [
        "optimize",
        inputPath, // always re-optimize from the converted source, never from an already-compressed tier
        output,
        "--compress", "meshopt",
        "--meshopt-level", "medium",
        "--texture-compress", "webp",
        "--texture-size", String(textureSizes[i]),
        "--flatten", "false",
        "--join", "false",
        "--instance", "false",
        "--palette", "false",
        "--simplify", ratio == null ? "false" : "true",
        "--simplify-ratio", ratio == null ? "0.5" : String(ratio),
        "--simplify-error", "0.001",
        "--simplify-lock-border", "true",
      ];

      await this.runCli(args, this.optimizeTimeoutMs);

      const size = (await fs.stat(output)).size;
      if (size < bestSize) {
        best = output;
        bestSize = size;
      } else {
        await fs.rm(output, { force: true }).catch(() => undefined);
      }

      if (bestSize <= target) break;
      if (ratio != null && bestSize > target) {
        warning = `Geometry simplification tier ${i} was used to reach the size target; review the model before publishing.`;
      }
    }

    if (best === inputPath) {
      // Even when optimization cannot beat the converted source, publish the
      // plain converted GLB rather than a larger "optimized" artifact.
      const fallback = outputPaths[0];
      await fs.copyFile(inputPath, fallback);
      best = fallback;
      warning = warning ?? "Optimizer did not reduce file size; published the converted GLB unchanged.";
    }

    if (bestSize > target) {
      warning = warning ?? `The model remains above the ${Math.round(target / 1024 / 1024)} MB preferred target.`;
    }

    return { path: best, warning };
  }

  private async runCli(args: string[], timeoutMs: number) {
    await execFileAsync("gltf-transform", args, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        NODE_OPTIONS: process.env.MODEL_OPTIMIZER_NODE_OPTIONS ?? "--max-old-space-size=2048",
      },
    });
  }

  private async inspectGlb(path: string) {
    await this.runCli(["inspect", path], Math.min(this.optimizeTimeoutMs, 2 * 60 * 1000));
  }

  private async hasAnimations(path: string): Promise<boolean> {
    const handle = await fs.open(path, "r");
    try {
      const header = Buffer.alloc(20);
      const first = await handle.read(header, 0, header.length, 0);
      if (first.bytesRead < 20) throw new Error("GLB is missing its first JSON chunk");
      if (header.toString("ascii", 0, 4) !== "glTF" || header.readUInt32LE(4) !== 2) {
        throw new Error("GLB structural validation failed");
      }

      const chunkLength = header.readUInt32LE(12);
      const chunkType = header.toString("ascii", 16, 20);
      if (chunkType !== "JSON" || chunkLength > 8 * 1024 * 1024) {
        throw new Error("GLB JSON chunk is invalid or unexpectedly large");
      }

      const jsonBuffer = Buffer.alloc(chunkLength);
      await handle.read(jsonBuffer, 0, chunkLength, 20);
      const json = JSON.parse(jsonBuffer.toString("utf8").replace(/\u0000+$/g, ""));
      return Array.isArray(json.animations) && json.animations.length > 0;
    } finally {
      await handle.close();
    }
  }

  private async validateGlb(path: string) {
    const stat = await fs.stat(path);
    if (stat.size < 20) throw new Error("GLB is empty or invalid");

    const handle = await fs.open(path, "r");
    try {
      const header = Buffer.alloc(12);
      const result = await handle.read(header, 0, 12, 0);
      if (
        result.bytesRead !== 12 ||
        header.toString("ascii", 0, 4) !== "glTF" ||
        header.readUInt32LE(4) !== 2 ||
        header.readUInt32LE(8) !== stat.size
      ) {
        throw new Error("GLB failed structural validation");
      }
    } finally {
      await handle.close();
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
        stage: terminal ? "FAILED" : "QUEUED",
        errorMessage: message,
        completedAt: terminal ? new Date() : null,
        startedAt: null,
      },
    });
    this.logger.error(`Conversion job ${id} failed: ${message}`);
  }

  private async recoverStaleJobs() {
    const uploadCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleUploads = await this.prisma.threeDConversionJob.updateMany({
      where: {
        status: ProcessingJobStatus.PROCESSING,
        stage: "UPLOADING",
        createdAt: { lt: uploadCutoff },
      },
      data: {
        status: ProcessingJobStatus.FAILED,
        stage: "FAILED",
        errorMessage: "Upload was never completed. Delete this job and upload the file again.",
        completedAt: new Date(),
      },
    });
    if (staleUploads.count > 0) {
      this.logger.warn(`Marked ${staleUploads.count} abandoned conversion upload(s) as failed`);
    }

    const cutoff = new Date(Date.now() - this.staleAfterMs);
    await this.prisma.threeDConversionJob.updateMany({
      where: {
        status: ProcessingJobStatus.PROCESSING,
        startedAt: { lt: cutoff },
      },
      data: {
        status: ProcessingJobStatus.QUEUED,
        stage: "QUEUED",
        errorMessage: "Recovered stale conversion worker job",
        startedAt: null,
      },
    });
  }

  /**
   * ZIP is an asset bundle, not a model format. Extract it without flattening
   * the directory tree so relative references used by OBJ/MTL, glTF/BIN,
   * FBX, USD and similar formats continue to resolve inside Blender.
   */
  private async prepareBlenderInput(sourcePath: string, inputExt: string, tempDir: string) {
    if (inputExt !== ".zip") {
      return { path: sourcePath, ext: inputExt };
    }

    const archiveDir = join(tempDir, "archive");
    await fs.mkdir(archiveDir, { recursive: true });

    let listing: string;
    try {
      ({ stdout: listing } = await execFileAsync("unzip", ["-Z1", sourcePath], {
        timeout: Math.min(this.timeoutMs, 2 * 60 * 1000),
        maxBuffer: 8 * 1024 * 1024,
      }));
    } catch (error) {
      throw new Error(
        "Unable to inspect ZIP archive: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    const entries = listing
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (entries.length === 0) throw new Error("ZIP archive is empty");
    if (entries.length > 5000) {
      throw new Error("ZIP archive contains too many files (maximum 5000)");
    }

    const safeEntries: string[] = [];
    for (const entry of entries) {
      const normalized = entry.replace(/\\/g, "/");
      const segments = normalized.split("/");
      if (
        normalized.startsWith("/") ||
        normalized.includes(String.fromCharCode(0)) ||
        segments.some((segment) => segment === "..")
      ) {
        throw new Error("ZIP archive contains an unsafe file path: " + entry);
      }

      const target = resolve(archiveDir, normalized);
      if (target !== archiveDir && !target.startsWith(archiveDir + sep)) {
        throw new Error("ZIP archive contains an unsafe extraction path");
      }
      safeEntries.push(normalized);
    }

    let totalUnpackedBytes = 0;
    try {
      const { stdout } = await execFileAsync("unzip", ["-l", sourcePath], {
        timeout: Math.min(this.timeoutMs, 2 * 60 * 1000),
        maxBuffer: 8 * 1024 * 1024,
      });
      for (const line of stdout.split(/\r?\n/)) {
        const match = /^\s*(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/.exec(line);
        if (match) totalUnpackedBytes += Number(match[1]);
      }
    } catch (error) {
      throw new Error(
        "Unable to inspect ZIP archive sizes: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    const maxUnpackedBytes =
      Number(process.env.CONVERSION_MAX_ARCHIVE_UNPACKED_MB ?? 1024) * 1024 * 1024;
    if (!Number.isFinite(maxUnpackedBytes) || maxUnpackedBytes <= 0) {
      throw new Error("CONVERSION_MAX_ARCHIVE_UNPACKED_MB must be positive");
    }
    if (totalUnpackedBytes > maxUnpackedBytes) {
      throw new Error(
        `ZIP archive expands to ${Math.round(totalUnpackedBytes / 1024 / 1024)} MB; maximum is ${Math.round(maxUnpackedBytes / 1024 / 1024)} MB`,
      );
    }

    // These are the files that can be the primary scene/model. Dependency
    // files such as .mtl, .bin and textures are deliberately not candidates.
    const primaryExtensions = new Set([
      ".abc", ".usd", ".usda", ".usdc", ".usdz",
      ".svg", ".pdf", ".obj", ".ply", ".stl", ".bvh",
      ".fbx", ".glb", ".gltf",
    ]);

    const primaryEntries = safeEntries.filter((entry) => {
      if (entry.endsWith("/")) return false;
      return primaryExtensions.has(extname(entry).toLowerCase());
    });

    if (primaryEntries.length === 0) {
      throw new Error(
        "ZIP archive does not contain a supported primary 3D/model file. " +
        "Expected one of OBJ, glTF, GLB, FBX, USD, Alembic, PLY, STL, BVH, SVG or PDF.",
      );
    }

    // USD commonly uses several .usd/.usda/.usdc layers: one root layer and
    // referenced dependency layers. Prefer the shallowest candidate so a
    // nested material/reference layer is not mistaken for a second model.
    // If multiple candidates exist at the same depth, the bundle is ambiguous
    // and we fail safely instead of converting an arbitrary file.
    const depth = (entry: string) => entry.split("/").filter(Boolean).length;
    const shallowestDepth = Math.min(...primaryEntries.map(depth));
    const rootCandidates = primaryEntries.filter((entry) => depth(entry) === shallowestDepth);

    if (rootCandidates.length > 1) {
      const names = rootCandidates.slice(0, 8).join(", ");
      const suffix = rootCandidates.length > 8 ? ", …" : "";
      throw new Error(
        `ZIP archive contains multiple primary model files at the root level (${rootCandidates.length}): ${names}${suffix}. Upload one primary scene/model per ZIP.`,
      );
    }

    await execFileAsync("unzip", ["-t", sourcePath], {
      timeout: this.timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    await execFileAsync("unzip", ["-qq", "-o", sourcePath, "-d", archiveDir], {
      timeout: this.timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });

    const verifyNoSymlinks = async (directory: string): Promise<void> => {
      const children = await fs.readdir(directory, { withFileTypes: true });
      for (const child of children) {
        const childPath = join(directory, child.name);
        if (child.isSymbolicLink()) {
          throw new Error("ZIP archives containing symbolic links are not supported");
        }
        if (child.isDirectory()) await verifyNoSymlinks(childPath);
      }
    };
    await verifyNoSymlinks(archiveDir);

    const primaryPath = resolve(archiveDir, primaryEntries[0]);
    const rel = relative(archiveDir, primaryPath);
    if (!rel || rel.startsWith(".." + sep) || resolve(archiveDir, rel) !== primaryPath) {
      throw new Error("Resolved primary model path is outside the extracted archive");
    }

    return { path: primaryPath, ext: extname(primaryEntries[0]).toLowerCase() };
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
          "--input", sourcePath,
          "--output", outputPath,
          "--ext", ext,
        ],
        { shell: false, stdio: ["ignore", "pipe", "pipe"] },
      );

      let stderr = "";
      let stdout = "";
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(new Error(`Blender conversion timed out after ${this.timeoutMs} ms`));
      }, this.timeoutMs);

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

}
