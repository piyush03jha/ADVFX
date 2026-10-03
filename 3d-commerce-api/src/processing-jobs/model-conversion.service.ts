import { Injectable, Logger } from "@nestjs/common";
import { ProductFileFormat } from "@prisma/client";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const execFileAsync = promisify(execFile);

const BLENDER_FORMATS = new Set<ProductFileFormat>([
  ProductFileFormat.GLTF,
  ProductFileFormat.OBJ,
  ProductFileFormat.PLY,
  ProductFileFormat.STL,
  ProductFileFormat.FBX,
  ProductFileFormat.ABC,
  ProductFileFormat.USD,
  ProductFileFormat.USDA,
  ProductFileFormat.USDC,
  ProductFileFormat.BVH,
  ProductFileFormat.SVG,
]);

@Injectable()
export class ModelConversionService {
  private readonly logger = new Logger(ModelConversionService.name);
  private readonly tmpRoot = process.env.MODEL_PROCESSING_TMP_DIR ?? "/tmp/3d-model-processing";
  private readonly blenderBin = process.env.BLENDER_BIN ?? "blender";
  private readonly gltfTransformBin = process.env.GLTF_TRANSFORM_BIN ?? "gltf-transform";
  private readonly validatorScript =
    process.env.GLTF_VALIDATOR_SCRIPT ??
    join(process.cwd(), "scripts", "validate-glb.cjs");
  private readonly timeoutMs = Number(process.env.MODEL_CONVERSION_TIMEOUT_MS ?? 10 * 60 * 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async convert(productFileId: string, jobId?: string): Promise<void> {
    const file = await this.prisma.productFile.findUnique({
      where: { id: productFileId },
      include: { generatedByJob: true },
    });

    if (!file) throw new Error(`Product file "${productFileId}" not found`);
    if (jobId) {
      const job = await this.prisma.productFileProcessingJob.findUnique({ where: { id: jobId }, select: { outputFileId: true } });
      if (job?.outputFileId) return;
    }

    if (file.fileType !== "MODEL" && file.format !== ProductFileFormat.PDF) {
      throw new Error("Conversion requested for an unsupported product file type");
    }

    const workDir = join(this.tmpRoot, randomUUID());
    await fs.mkdir(workDir, { recursive: true });

    try {
      const sourceExt = this.extensionFor(file.originalName, file.format);
      const sourcePath = join(workDir, `source.${sourceExt}`);
      const rawGlb = join(workDir, "converted.glb");
      const optimizedGlb = join(workDir, "optimized.glb");

      this.logger.log(`model ${productFileId}: downloading source`);
      await fs.writeFile(sourcePath, await this.storage.read(file.storageKey));

      let blenderInput = sourcePath;
      if (file.format !== ProductFileFormat.GLB) {
        if (file.format !== ProductFileFormat.PDF && !BLENDER_FORMATS.has(file.format)) {
          throw new Error(`Unsupported 3D conversion format: ${file.format}`);
        }

        if (file.format === ProductFileFormat.PDF || file.format === ProductFileFormat.SVG) {
          blenderInput = await this.svgToExtrusionSource(sourcePath, workDir);
        }

        this.logger.log(`model ${productFileId}: Blender import/export`);
        await this.runBlender(blenderInput, rawGlb, workDir);
      } else {
        await fs.copyFile(sourcePath, rawGlb);
      }

      await this.assertGlb(rawGlb);

      this.logger.log(`model ${productFileId}: optimizing`);
      await this.run(
        this.gltfTransformBin,
        [
          "optimize",
          rawGlb,
          optimizedGlb,
          "--compress",
          "draco",
          "--texture-compress",
          "webp",
          "--texture-size",
          "2048",
        ],
        workDir,
      );

      await this.assertGlb(optimizedGlb);

      this.logger.log(`model ${productFileId}: validating optimized GLB`);
      await this.validateGlb(optimizedGlb);

      const outputBuffer = await fs.readFile(optimizedGlb);
      const sourceSize = Number(file.fileSize);
      const optimizedSize = outputBuffer.length;
      const reductionBytes = sourceSize - optimizedSize;
      const reductionPercent =
        sourceSize > 0 ? ((reductionBytes / sourceSize) * 100).toFixed(2) : "0.00";

      this.logger.log(
        `model ${productFileId}: source=${sourceSize} bytes, optimized=${optimizedSize} bytes, reduction=${reductionPercent}%`,
      );

      // Persist the optimized artifact separately first. The storefront is
      // switched to this URL before the original source is removed.
      const generated = await this.storage.saveGeneratedFile(
        outputBuffer,
        file.productId,
        `${this.safeBaseName(file.originalName)}.glb`,
      );

      let output;
      try {
        output = await this.prisma.$transaction(async (tx) => {
          const created = await tx.productFile.create({
            data: {
              productId: file.productId,
              originalName: `${this.safeBaseName(file.originalName)}.glb`,
              storageKey: generated.storageKey,
              storageUrl: generated.storageUrl,
              format: ProductFileFormat.GLB,
              fileType: "MODEL",
              mimeType: "model/gltf-binary",
              fileSize: BigInt(optimizedSize),
              processingStatus: "COMPLETED",
              convertedFromId: file.id,
            },
          });

          const publicUrl =
            generated.storageUrl ??
            this.storage.getPublicAssetUrl(generated.storageKey);

          const existingModelMedia = await tx.productMedia.findFirst({
            where: { productId: file.productId, type: "MODEL_PREVIEW" },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          });

          if (existingModelMedia) {
            await tx.productMedia.update({
              where: { id: existingModelMedia.id },
              data: { url: publicUrl, isPrimary: true },
            });
            await tx.productMedia.updateMany({
              where: {
                productId: file.productId,
                type: "MODEL_PREVIEW",
                id: { not: existingModelMedia.id },
              },
              data: { isPrimary: false },
            });
          } else {
            await tx.productMedia.create({
              data: {
                productId: file.productId,
                type: "MODEL_PREVIEW",
                url: publicUrl,
                altText: file.originalName,
                sortOrder: 0,
                isPrimary: true,
              },
            });
          }

          return created;
        });
      } catch (error) {
        await this.storage.delete(generated.storageKey).catch(() => undefined);
        throw error;
      }

      if (jobId) {
        await this.prisma.productFileProcessingJob.update({
          where: { id: jobId },
          data: { outputFileId: output.id },
        });
      }

      this.logger.log(
        `model ${productFileId}: READY -> ${output.id}; source=${sourceSize} bytes; optimized=${optimizedSize} bytes; reduction=${reductionPercent}%`,
      );

    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async svgToExtrusionSource(source: string, workDir: string): Promise<string> {
    const pdf = process.env.PDF_TO_SVG_BIN;
    if (pdf && source.toLowerCase().endsWith(".pdf")) {
      const out = join(workDir, "page.svg");
      await this.run(pdf, ["-f", "1", "-singlefile", "-svg", source, join(workDir, "page")], workDir);
      return out;
    }
    return source;
  }

  private async runBlender(input: string, output: string, workDir: string): Promise<void> {
    await this.run(
      this.blenderBin,
      [
        "--background",
        "--factory-startup",
        "--python-exit-code",
        "1",
        "--python",
        join(process.cwd(), "scripts", "blender", "to_glb.py"),
        "--",
        input,
        output,
      ],
      workDir,
    );
  }

  private async validateGlb(file: string): Promise<void> {
    await this.run("node", [this.validatorScript, file], process.cwd());
  }

  private async assertGlb(file: string): Promise<void> {
    const handle = await fs.open(file, "r");
    try {
      const header = Buffer.alloc(12);
      await handle.read(header, 0, 12, 0);
      if (header.toString("ascii", 0, 4) !== "glTF") {
        throw new Error("Conversion output is not a GLB");
      }
      if (header.readUInt32LE(4) !== 2) {
        throw new Error("Conversion output is not glTF 2.0");
      }
      const declaredLength = header.readUInt32LE(8);
      const stat = await handle.stat();
      if (declaredLength !== stat.size) {
        throw new Error(`Invalid GLB length: header=${declaredLength}, file=${stat.size}`);
      }
    } finally {
      await handle.close();
    }
  }

  private async run(command: string, args: string[], cwd: string): Promise<void> {
    try {
      await execFileAsync(command, args, {
        cwd,
        timeout: this.timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: {
          ...process.env,
          BLENDER_USER_CONFIG: "/tmp/blender-config",
          BLENDER_USER_SCRIPTS: "/tmp/blender-scripts",
        },
      });
    } catch (error: any) {
      const stderr = String(error?.stderr ?? error?.stdout ?? error?.message ?? "process failed");
      throw new Error(`${command} failed: ${stderr.slice(-8000)}`);
    }
  }

  private extensionFor(originalName: string, format: ProductFileFormat): string {
    const match = originalName.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (match) return match[1];
    return format.toLowerCase();
  }

  private safeBaseName(originalName: string): string {
    return originalName
      .replace(/\.[^.]+$/, "")
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "model";
  }
}
