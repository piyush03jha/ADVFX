import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
import type { SaveProductFileOptions, StoredFile } from "./storage.types";

type StorageProvider = "local" | "s3" | "r2";

@Injectable()
export class StorageService {
  private readonly provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase() as StorageProvider;
  private readonly root = resolve(process.env.STORAGE_ROOT ?? join(process.cwd(), "storage"));
  private readonly bucket = process.env.STORAGE_BUCKET ?? "";
  private readonly endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
  private readonly publicBaseUrl = (process.env.STORAGE_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  private readonly accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  private readonly secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";
  private readonly region = process.env.STORAGE_REGION ?? (this.provider === "r2" ? "auto" : "us-east-1");

  constructor() {
    if (this.provider !== "local" && (!this.bucket || !this.endpoint || !this.accessKey || !this.secretKey || !this.publicBaseUrl)) {
      throw new Error(
        "Remote storage requires STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY and STORAGE_PUBLIC_BASE_URL",
      );
    }
  }

  async saveProductFile(options: SaveProductFileOptions): Promise<StoredFile> {
    return this.saveScopedFile(["products", options.productId.trim()], options.filename.trim(), options.buffer);
  }

  async saveCategoryFile(categoryId: string, originalName: string, buffer: Buffer): Promise<StoredFile> {
    return this.saveScopedFile(["categories", categoryId.trim()], originalName.trim(), buffer);
  }

  async saveCustomRequestFile(requestId: string, originalName: string, buffer: Buffer) {
    return this.saveScopedFile(["custom-requests", requestId.trim()], originalName.trim(), buffer);
  }

  async saveGeneratedFile(buffer: Buffer, productId: string, fileName: string) {
    return this.saveScopedFile(["products", productId.trim(), "generated"], fileName.trim(), buffer);
  }

  async saveBundleFile(productId: string, bundleId: string, relativePath: string, buffer: Buffer): Promise<StoredFile> {
    const normalizedProductId = this.normalizePathSegment(productId, "productId");
    const normalizedBundleId = this.normalizePathSegment(bundleId, "bundleId");
    const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

    if (!normalizedPath || normalizedPath.includes("\0") || normalizedPath.split("/").some((segment) => segment === "." || segment === "..")) {
      throw new BadRequestException("Unsafe bundle file path");
    }

    return this.saveScopedFile(["products", normalizedProductId, "bundles", normalizedBundleId], normalizedPath, buffer);
  }

  private async saveScopedFile(segments: string[], originalName: string, buffer: Buffer): Promise<StoredFile> {
    if (!originalName || !buffer?.length) throw new BadRequestException("File name and non-empty file are required");

    const extension = extname(originalName).toLowerCase();
    if (!extension) throw new BadRequestException("File extension is required");

    const safeBaseName = basename(originalName, extension)
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
    const filename = `${randomUUID()}-${safeBaseName || "file"}${extension}`;
    const storageKey = [...segments, filename].join("/");

    if (this.provider === "local") {
      const directory = join(this.root, ...segments);
      await mkdir(directory, { recursive: true });
      const absolutePath = join(directory, filename);
      try {
        await writeFile(absolutePath, buffer);
      } catch {
        throw new InternalServerErrorException("Unable to store uploaded file");
      }
      return { storageKey, storageUrl: `/storage/${storageKey}`, storagePath: absolutePath, size: buffer.length };
    }

    await this.putObject(storageKey, buffer, this.contentType(extension));
    return {
      storageKey,
      storageUrl: `${this.publicBaseUrl}/${storageKey.split("/").map(encodeURIComponent).join("/")}`,
      storagePath: "",
      size: buffer.length,
    };
  }

  async delete(storageKey: string): Promise<void> {
    if (this.provider === "local") {
      try { await unlink(this.getAbsolutePath(storageKey)); } catch (error: unknown) {
        const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
        if (code !== "ENOENT") throw new InternalServerErrorException("Unable to delete stored file");
      }
      return;
    }
    await this.deleteObject(storageKey);
  }

  async exists(storageKey: string): Promise<boolean> {
    if (this.provider === "local") {
      try { await access(this.getAbsolutePath(storageKey)); return true; } catch { return false; }
    }
    try {
      await this.requestObject("HEAD", storageKey);
      return true;
    } catch {
      return false;
    }
  }

  getAbsolutePath(storageKey: string): string {
    if (this.provider !== "local") throw new BadRequestException("Remote storage does not expose local paths");
    const normalizedKey = storageKey.replace(/\\/g, "/");
    const absolutePath = resolve(this.root, normalizedKey);
    if (absolutePath !== this.root && !absolutePath.startsWith(`${this.root}${sep}`)) {
      throw new BadRequestException("Invalid storage key");
    }
    return absolutePath;
  }

  private async putObject(key: string, body: Buffer, contentType: string) {
    await this.requestObject("PUT", key, body, contentType);
  }

  private async deleteObject(key: string) {
    await this.requestObject("DELETE", key);
  }

  private async requestObject(method: "PUT" | "DELETE" | "HEAD", key: string, body?: Buffer, contentType?: string) {
    const hostUrl = `${this.endpoint}/${encodeURIComponent(this.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const url = new URL(hostUrl);
    const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (contentType) headers["content-type"] = contentType;

    const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name].trim()}\n`).join("");
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalRequest = [
      method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.deriveSigningKey(dateStamp);
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers,
      body: method === "PUT" ? new Uint8Array(body ?? Buffer.alloc(0)) : undefined,
    });

    if (!response.ok && !(method === "DELETE" && response.status === 404)) {
      throw new InternalServerErrorException(`Remote storage request failed (${response.status})`);
    }
  }

  private deriveSigningKey(dateStamp: string) {
    const kDate = createHmac("sha256", `AWS4${this.secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }

  private contentType(extension: string) {
    const types: Record<string, string> = {
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".bin": "application/octet-stream",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".obj": "text/plain",
      ".mtl": "text/plain",
      ".svg": "image/svg+xml",
    };
    return types[extension] ?? "application/octet-stream";
  }

  private normalizePathSegment(value: string, name: string) {
    const normalized = value.trim();
    if (!normalized || normalized === "." || normalized === ".." || normalized.includes("/") || normalized.includes("\\") || normalized.includes("\0")) {
      throw new BadRequestException(`Invalid ${name}`);
    }
    return normalized;
  }
}
