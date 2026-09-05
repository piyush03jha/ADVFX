// src/processing-jobs/model-converter.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ProductFileFormat } from "@prisma/client";
import { spawn } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, resolve } from "node:path";

export interface ModelConversionResult {
  outputPath: string;
  outputFormat: "GLB";
  outputMimeType: string;
  outputExtension: ".glb";
  fileSize: number;
}

@Injectable()
export class ModelConverterService {
  private readonly logger = new Logger(
    ModelConverterService.name,
  );

  /**
   * Native converter binary.
   *
   * Default:
   *   blender
   *
   * Override with:
   *   MODEL_CONVERTER_BIN=/path/to/blender
   */
  private readonly converterBinary =
    process.env.MODEL_CONVERTER_BIN ?? "blender";

  /**
   * Maximum amount of time allowed for one conversion.
   *
   * Default:
   *   10 minutes
   */
  private readonly timeoutMs =
    this.getPositiveNumber(
      process.env.MODEL_CONVERTER_TIMEOUT_MS,
      10 * 60 * 1000,
    );

  /**
   * Convert a supported 3D format into GLB.
   *
   * GLB is the canonical browser delivery format.
   */
  async convert(
    format: ProductFileFormat,
    inputPath: string,
    outputPath: string,
  ): Promise<ModelConversionResult> {
    await this.assertInput(inputPath);

    switch (format) {
      case ProductFileFormat.GLTF:
        return this.convertGltf(
          inputPath,
          outputPath,
        );

      case ProductFileFormat.GLB:
        return this.validateExistingGlb(
          inputPath,
          outputPath,
        );

      case ProductFileFormat.OBJ:
      case ProductFileFormat.STL:
      case ProductFileFormat.PLY:
      case ProductFileFormat.FBX:
      case ProductFileFormat.USD:
      case ProductFileFormat.ABC:
      case ProductFileFormat.BVH:
        return this.convertWithBlender(
          inputPath,
          outputPath,
        );

      default:
        throw new BadRequestException(
          `3D conversion is not supported for ${format}`,
        );
    }
  }

  /**
   * Convert glTF into canonical GLB.
   *
   * Blender resolves external:
   *
   * - .bin buffers
   * - textures
   * - referenced assets
   *
   * when they are available beside the input .gltf file.
   */
  private async convertGltf(
    inputPath: string,
    outputPath: string,
  ): Promise<ModelConversionResult> {
    return this.convertWithBlender(
      inputPath,
      outputPath,
    );
  }

  /**
   * GLB is already the canonical output format.
   *
   * We copy it to the generated output location so that the
   * processing pipeline remains consistent.
   */
  private async validateExistingGlb(
    inputPath: string,
    outputPath: string,
  ): Promise<ModelConversionResult> {
    const { copyFile } =
      await import("node:fs/promises");

    await this.ensureOutputDirectory(
      outputPath,
    );

    await copyFile(
      inputPath,
      outputPath,
    );

    const file = await stat(outputPath);

    if (!file.size) {
      throw new Error(
        "Generated GLB is empty",
      );
    }

    return {
      outputPath,
      outputFormat: "GLB",
      outputMimeType: "model/gltf-binary",
      outputExtension: ".glb",
      fileSize: file.size,
    };
  }

  /**
   * Convert a native 3D format using Blender.
   *
   * Supported inputs:
   *
   * - OBJ
   * - STL
   * - PLY
   * - FBX
   * - USD
   * - USDA
   * - USDC
   * - USDZ
   * - Alembic
   * - glTF
   * - GLB
   * - BVH
   */
  private async convertWithBlender(
    inputPath: string,
    outputPath: string,
  ): Promise<ModelConversionResult> {
    await this.ensureOutputDirectory(
      outputPath,
    );

    const script = `
import bpy
import sys
import os

input_path = os.path.abspath(sys.argv[-2])
output_path = os.path.abspath(sys.argv[-1])

# ---------------------------------------------------------
# Reset Blender
# ---------------------------------------------------------

bpy.ops.wm.read_factory_settings(
    use_empty=True
)

extension = os.path.splitext(
    input_path
)[1].lower()

# ---------------------------------------------------------
# Import source format
# ---------------------------------------------------------

if extension == ".obj":
    bpy.ops.wm.obj_import(
        filepath=input_path
    )

elif extension == ".stl":
    bpy.ops.wm.stl_import(
        filepath=input_path
    )

elif extension == ".ply":
    bpy.ops.wm.ply_import(
        filepath=input_path
    )

elif extension == ".fbx":
    bpy.ops.import_scene.fbx(
        filepath=input_path
    )

elif extension in [
    ".usd",
    ".usda",
    ".usdc",
    ".usdz",
]:
    bpy.ops.wm.usd_import(
        filepath=input_path
    )

elif extension == ".abc":
    bpy.ops.wm.alembic_import(
        filepath=input_path
    )

elif extension == ".gltf":
    bpy.ops.import_scene.gltf(
        filepath=input_path
    )

elif extension == ".glb":
    bpy.ops.import_scene.gltf(
        filepath=input_path
    )

elif extension == ".bvh":
    bpy.ops.import_anim.bvh(
        filepath=input_path
    )

else:
    raise RuntimeError(
        "Unsupported input format: "
        + extension
    )

# ---------------------------------------------------------
# Verify imported scene
# ---------------------------------------------------------

bpy.ops.object.select_all(
    action="SELECT"
)

selected_objects = (
    bpy.context.selected_objects
)

if not selected_objects:
    raise RuntimeError(
        "No geometry or objects were imported"
    )

# ---------------------------------------------------------
# Export canonical GLB
# ---------------------------------------------------------

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)

# ---------------------------------------------------------
# Verify output
# ---------------------------------------------------------

if not os.path.exists(output_path):
    raise RuntimeError(
        "Blender did not create the GLB output"
    )

output_size = os.path.getsize(
    output_path
)

if output_size == 0:
    raise RuntimeError(
        "Blender created an empty GLB"
    )
`;

    await this.runProcess([
      "--background",
      "--python-expr",
      script,
      "--",
      inputPath,
      outputPath,
    ]);

    const file = await stat(
      outputPath,
    );

    if (!file.size) {
      throw new Error(
        "3D conversion completed but generated GLB is empty",
      );
    }

    this.logger.log(
      `Converted ${inputPath} → ${outputPath} (${file.size} bytes)`,
    );

    return {
      outputPath,
      outputFormat: "GLB",
      outputMimeType: "model/gltf-binary",
      outputExtension: ".glb",
      fileSize: file.size,
    };
  }

  /**
   * Execute Blender as a child process.
   *
   * shell:false is intentional so user-controlled file paths
   * cannot become shell commands.
   */
  private runProcess(
    args: string[],
  ): Promise<void> {
    return new Promise(
      (resolvePromise, reject) => {
        const child = spawn(
          this.converterBinary,
          args,
          {
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
            shell: false,
          },
        );

        let stdout = "";
        let stderr = "";

        child.stdout.on(
          "data",
          (chunk) => {
            stdout += chunk.toString();

            if (stdout.length > 32_000) {
              stdout =
                stdout.slice(-32_000);
            }
          },
        );

        child.stderr.on(
          "data",
          (chunk) => {
            stderr += chunk.toString();

            if (stderr.length > 32_000) {
              stderr =
                stderr.slice(-32_000);
            }
          },
        );

        const timeout = setTimeout(
          () => {
            child.kill("SIGKILL");

            reject(
              new Error(
                `3D conversion timed out after ${this.timeoutMs}ms`,
              ),
            );
          },
          this.timeoutMs,
        );

        child.once(
          "error",
          (error) => {
            clearTimeout(timeout);

            reject(
              new Error(
                `Unable to start 3D converter "${this.converterBinary}": ${error.message}`,
              ),
            );
          },
        );

        child.once(
          "close",
          (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
              const details =
                stderr.trim() ||
                stdout.trim();

              reject(
                new Error(
                  `3D converter exited with code ${code}${
                    details
                      ? `: ${details.slice(-4000)}`
                      : ""
                  }`,
                ),
              );

              return;
            }

            resolvePromise();
          },
        );
      },
    );
  }

  /**
   * Verify that the input exists and is readable.
   */
  private async assertInput(
    inputPath: string,
  ): Promise<void> {
    const absolutePath =
      resolve(inputPath);

    await access(
      absolutePath,
      fsConstants.R_OK,
    );
  }

  /**
   * Ensure that the generated output directory exists.
   */
  private async ensureOutputDirectory(
    outputPath: string,
  ): Promise<void> {
    const { mkdir } =
      await import("node:fs/promises");

    await mkdir(
      dirname(
        resolve(outputPath),
      ),
      {
        recursive: true,
      },
    );
  }

  /**
   * Parse a positive numeric environment value.
   */
  private getPositiveNumber(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return parsed;
  }
}