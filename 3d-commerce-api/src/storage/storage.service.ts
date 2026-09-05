import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  extname,
  join,
  resolve,
  sep,
} from "node:path";
import type {
  SaveProductFileOptions,
  StoredFile,
} from "./storage.types";

@Injectable()
export class StorageService {
  private readonly root = resolve(
    process.env.STORAGE_ROOT ??
      join(process.cwd(), "storage"),
  );

  async saveProductFile(
    options: SaveProductFileOptions,
  ): Promise<StoredFile> {
    const productId = options.productId.trim();
    const originalName = options.filename.trim();

    if (!productId) {
      throw new BadRequestException("Product ID is required");
    }

    if (!originalName) {
      throw new BadRequestException("File name is required");
    }

    if (!options.buffer?.length) {
      throw new BadRequestException("Uploaded file is empty");
    }

    return this.saveScopedFile(
      ["products", productId],
      originalName,
      options.buffer,
    );
  }

  async saveCustomRequestFile(
    requestId: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<{
    storageKey: string;
    storageUrl: string;
  }> {
    const normalizedRequestId = requestId.trim();
    const normalizedOriginalName = originalName.trim();

    if (!normalizedRequestId) {
      throw new BadRequestException(
        "Custom request ID is required",
      );
    }

    if (!normalizedOriginalName) {
      throw new BadRequestException("File name is required");
    }

    if (!buffer?.length) {
      throw new BadRequestException("Uploaded file is empty");
    }

    return this.saveScopedFile(
      ["custom-requests", normalizedRequestId],
      normalizedOriginalName,
      buffer,
    );
  }

  /**
   * Saves a generated/converted file for a product.
   *
   * Generated files are kept separate from the original upload:
   *
   * storage/
   *   products/
   *     <productId>/
   *       <original-file>
   *       generated/
   *         <generated-file>
   */
  async saveGeneratedFile(
    buffer: Buffer,
    productId: string,
    fileName: string,
  ): Promise<StoredFile> {
    const normalizedProductId = productId.trim();
    const normalizedFileName = fileName.trim();

    if (!normalizedProductId) {
      throw new BadRequestException("Product ID is required");
    }

    if (!normalizedFileName) {
      throw new BadRequestException("File name is required");
    }

    if (!buffer?.length) {
      throw new BadRequestException(
        "Generated file is empty",
      );
    }

    return this.saveScopedFile(
      ["products", normalizedProductId, "generated"],
      normalizedFileName,
      buffer,
    );
  }

  async saveBundleFile(
  productId: string,
  bundleId: string,
  relativePath: string,
  buffer: Buffer,
): Promise<StoredFile> {
  const normalizedProductId =
    this.normalizePathSegment(
      productId,
      "productId",
    );

  const normalizedBundleId =
    this.normalizePathSegment(
      bundleId,
      "bundleId",
    );

  const normalizedPath =
    relativePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

  if (
    !normalizedPath ||
    normalizedPath.includes("\0") ||
    normalizedPath
      .split("/")
      .some(
        (segment) =>
          segment === "." ||
          segment === "..",
      )
  ) {
    throw new Error(
      "Unsafe bundle file path",
    );
  }

  return this.saveScopedFile(
    [
      "products",
      normalizedProductId,
      "bundles",
      normalizedBundleId,
    ],
    normalizedPath,
    buffer,
  );
}

  private async saveScopedFile(
    segments: string[],
    originalName: string,
    buffer: Buffer,
  ): Promise<StoredFile> {
    const extension = extname(originalName).toLowerCase();

    if (!extension) {
      throw new BadRequestException(
        "File extension is required",
      );
    }

    const directory = join(
      this.root,
      ...segments,
    );

    await mkdir(directory, {
      recursive: true,
    });

    const safeBaseName = basename(
      originalName,
      extension,
    )
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);

    const filename =
      `${randomUUID()}-${safeBaseName || "file"}${extension}`;

    const absolutePath = join(
      directory,
      filename,
    );

    try {
      await writeFile(
        absolutePath,
        buffer,
      );
    } catch {
      throw new InternalServerErrorException(
        "Unable to store uploaded file",
      );
    }

    const storageKey = [
      ...segments,
      filename,
    ].join("/");

    return {
      storageKey,
      storageUrl: `/storage/${storageKey}`,
      storagePath: absolutePath,
      size: buffer.length,
    };
  }

  async delete(
    storageKey: string,
  ): Promise<void> {
    const absolutePath =
      this.getAbsolutePath(storageKey);

    try {
      await unlink(absolutePath);
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? (error as { code?: string }).code
          : undefined;

      if (code !== "ENOENT") {
        throw new InternalServerErrorException(
          "Unable to delete stored file",
        );
      }
    }
  }

  async exists(
    storageKey: string,
  ): Promise<boolean> {
    try {
      await access(
        this.getAbsolutePath(storageKey),
      );

      return true;
    } catch {
      return false;
    }
  }

  getAbsolutePath(
    storageKey: string,
  ): string {
    const normalizedKey = storageKey.replace(
      /\\/g,
      "/",
    );

    const absolutePath = resolve(
      this.root,
      normalizedKey,
    );

    if (
      absolutePath !== this.root &&
      !absolutePath.startsWith(
        `${this.root}${sep}`,
      )
    ) {
      throw new BadRequestException(
        "Invalid storage key",
      );
    }

    return absolutePath;
  }

  private normalizePathSegment(
  value: string,
  name: string,
): string {
  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.includes("\0")
  ) {
    throw new Error(
      `Invalid ${name}`,
    );
  }

  return normalized;
}

}