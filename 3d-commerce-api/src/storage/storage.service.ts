import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { access, mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { basename, extname, join, resolve, sep } from "node:path";
import type { SaveProductFileOptions, StoredFile } from "./storage.types";

type StorageProvider = "local" | "s3";

@Injectable()
export class StorageService {
  private readonly provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase() as StorageProvider;
  private readonly root = resolve(process.env.STORAGE_ROOT ?? join(process.cwd(), "storage"));
  private readonly bucket = process.env.STORAGE_BUCKET ?? "";
  private readonly endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
  private readonly publicBaseUrl = (process.env.STORAGE_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  private readonly accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  private readonly secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";
  private readonly region = process.env.STORAGE_REGION ?? "us-east-1";

  constructor() {
    if (!["local", "s3"].includes(this.provider)) {
      throw new Error(`Unsupported storage provider: ${this.provider}`);
    }

    if (this.provider === "s3" && (!this.bucket || !this.endpoint || !this.accessKey || !this.secretKey)) {
      throw new Error("S3-compatible storage requires STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY");
    }
  }

  async saveProductFile(options: SaveProductFileOptions): Promise<StoredFile> {
    return this.saveScopedFile(["products", options.productId.trim()], options.filename.trim(), options.buffer, true, true);
  }

  async saveCategoryImage(categoryId: string, filename: string, buffer: Buffer): Promise<StoredFile> {
    return this.saveScopedFile(["categories", categoryId.trim()], filename.trim(), buffer, true);
  }

  async saveCustomBuildCategoryImage(categoryId: string, originalName: string, buffer: Buffer): Promise<StoredFile> { return this.saveScopedFile(["custom-build-categories", categoryId.trim()], originalName.trim(), buffer); }
  async saveCustomBuildOptionImage(optionId: string, originalName: string, buffer: Buffer): Promise<StoredFile> { return this.saveScopedFile(["custom-build-options", optionId.trim()], originalName.trim(), buffer); }
  async saveCustomRequestFile(requestId: string, originalName: string, buffer: Buffer) { return this.saveScopedFile(["custom-requests", requestId.trim()], originalName.trim(), buffer); }
  async saveReviewImage(reviewScope: string, filename: string, buffer: Buffer): Promise<StoredFile> { return this.saveScopedFile(["reviews", reviewScope.trim()], filename.trim(), buffer); }
  async saveGeneratedFile(buffer: Buffer, productId: string, fileName: string) { return this.saveScopedFile(["products", productId.trim(), "generated"], fileName.trim(), buffer); }

  /**
   * Store a worker-produced file without buffering it through the API.
   * The worker may produce a large GLB on local disk; only the final
   * object upload is buffered for S3-compatible providers.
   */
  async uploadFileFromPath(storageKey: string, sourcePath: string, contentType: string): Promise<number> {
    const normalizedKey = this.normalizeRemoteKey(storageKey);
    const { stat, copyFile } = await import("node:fs/promises");
    const info = await stat(sourcePath);

    if (this.provider === "local") {
      const destination = this.getAbsolutePath(normalizedKey);
      await mkdir(join(destination, ".."), { recursive: true });
      await copyFile(sourcePath, destination);
      return info.size;
    }

    const buffer = await readFile(sourcePath);
    await this.putObject(normalizedKey, buffer, contentType, "private, max-age=0, no-cache");
    return buffer.length;
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

  private async saveScopedFile(segments: string[], originalName: string, buffer: Buffer, exposeThroughAssetRoute = false, deterministic = false): Promise<StoredFile> {
    if (!originalName || !buffer?.length) throw new BadRequestException("File name and non-empty file are required");
    const extension = extname(originalName).toLowerCase();
    if (!extension) throw new BadRequestException("File extension is required");

    const safeBaseName = basename(originalName, extension).normalize("NFKC").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
    const filename = deterministic
      ? `${createHash("sha256").update(buffer).digest("hex")}${extension}`
      : `${randomUUID()}-${safeBaseName || "file"}${extension}`;
    const storageKey = [...segments, filename].join("/");

    if (this.provider === "local") {
      const directory = join(this.root, ...segments);
      await mkdir(directory, { recursive: true });
      const absolutePath = join(directory, filename);
      try { await writeFile(absolutePath, buffer); }
      catch { throw new InternalServerErrorException("Unable to store uploaded file"); }
      return { storageKey, storageUrl: `/storage/${storageKey}`, storagePath: absolutePath, size: buffer.length };
    }

    await this.putObject(storageKey, buffer, this.contentType(extension), exposeThroughAssetRoute ? "public, max-age=31536000, immutable" : undefined);
    return {
      storageKey,
      storageUrl: this.publicBaseUrl
        ? `${this.publicBaseUrl}/${storageKey.split("/").map(encodeURIComponent).join("/")}`
        : exposeThroughAssetRoute ? this.getPublicAssetUrl(storageKey) : null,
      storagePath: "",
      size: buffer.length,
    };
  }

  getPublicAssetUrl(storageKey: string): string {
    const normalizedKey = this.normalizeRemoteKey(storageKey);
    return `/api/assets/${normalizedKey.split("/").map(encodeURIComponent).join("/")}`;
  }

  getContentTypeForStorageKey(storageKey: string): string {
    return this.contentType(extname(storageKey).toLowerCase());
  }

  private normalizeRemoteKey(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.includes("\0") || normalized.split("/").some((segment) => segment === "." || segment === "..")) throw new BadRequestException("Invalid storage key");
    return normalized;
  }

  async downloadTo(storageKey: string, destination: string): Promise<void> {
    if (this.provider === "local") {
      const { copyFile } = await import("node:fs/promises");
      await copyFile(this.getAbsolutePath(storageKey), destination);
      return;
    }

    const response = await this.requestObjectResponse("GET", storageKey);
    if (!response.body) throw new InternalServerErrorException("Unable to read stored file");
    const stream = Readable.fromWeb(response.body as any);
    const { createWriteStream } = await import("node:fs");
    await new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(destination);
      stream.pipe(output);
      output.on("finish", () => resolvePromise());
      output.on("error", reject);
      stream.on("error", reject);
    });
  }

  async openReadStream(storageKey: string): Promise<{ stream: Readable; size?: number }> {
    if (this.provider === "local") {
      const { stat } = await import("node:fs/promises");
      const path = this.getAbsolutePath(storageKey);
      const info = await stat(path).catch(() => {
        throw new NotFoundException("Stored file not found");
      });
      return { stream: createReadStream(path), size: info.size };
    }

    const response = await this.requestObjectResponse("GET", storageKey);
    if (!response.body) throw new NotFoundException("Stored file not found");
    const len = response.headers.get("content-length");
    return {
      stream: Readable.fromWeb(response.body as any),
      size: len ? Number(len) : undefined,
    };
  }

  async getObjectSize(storageKey: string): Promise<number> {
    if (this.provider === "local") {
      const { stat } = await import("node:fs/promises");
      const info = await stat(this.getAbsolutePath(storageKey)).catch(() => {
        throw new NotFoundException("Stored file not found");
      });
      return info.size;
    }

    const response = await this.requestObjectResponse("HEAD", storageKey);
    const size = Number(response.headers.get("content-length") ?? NaN);
    if (!Number.isFinite(size)) {
      throw new BadGatewayException("Remote storage did not return object size");
    }
    return size;
  }

  async openReadStreamRange(
    storageKey: string,
    start: number,
    end?: number,
  ): Promise<{ stream: Readable; size: number; totalSize: number; start: number; end: number }> {
    if (
      !Number.isInteger(start) ||
      start < 0 ||
      (end !== undefined && (!Number.isInteger(end) || end < start))
    ) {
      throw new BadRequestException("Invalid byte range");
    }

    if (this.provider === "local") {
      const { stat } = await import("node:fs/promises");
      const path = this.getAbsolutePath(storageKey);
      const info = await stat(path).catch(() => {
        throw new NotFoundException("Stored file not found");
      });
      if (start >= info.size) {
        throw new HttpException(
          { error: "Requested byte range is not satisfiable" },
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }
      const boundedEnd = end === undefined ? info.size - 1 : Math.min(end, info.size - 1);
      return {
        stream: createReadStream(path, { start, end: boundedEnd }),
        size: boundedEnd - start + 1,
        totalSize: info.size,
        start,
        end: boundedEnd,
      };
    }

    const rangeHeader =
      end === undefined ? `bytes=${start}-` : `bytes=${start}-${end}`;
    let response: Response;
    try {
      response = await this.requestObjectResponse(
        "GET",
        storageKey,
        { range: rangeHeader },
      );
    } catch (error) {
      if (error instanceof InternalServerErrorException && /\(416\)/.test(error.message)) {
        throw new HttpException(
          { error: "Requested byte range is not satisfiable" },
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }
      throw error;
    }
    if (!response.body) throw new NotFoundException("Stored file not found");

    const contentRange = response.headers.get("content-range") ?? "";
    const match = /^bytes \d+-(\d+)\/(\d+)$/.exec(contentRange);
    if (!match) throw new BadGatewayException("Remote storage returned an invalid byte range");

    return {
      stream: Readable.fromWeb(response.body as any),
      size: Number(match[1]) - start + 1,
      totalSize: Number(match[2]),
      start,
      end: Number(match[1]),
    };
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    if (this.provider === "local") {
      return createReadStream(this.getAbsolutePath(storageKey));
    }

    const response = await this.requestObjectResponse("GET", storageKey);
    if (!response.body) throw new InternalServerErrorException("Stored file not found");
    return Readable.fromWeb(response.body as any);
  }

  async read(storageKey: string): Promise<Buffer> {
    if (this.provider === "local") {
      try { return await readFile(this.getAbsolutePath(storageKey)); }
      catch { throw new InternalServerErrorException("Unable to read stored file"); }
    }
    const response = await this.requestObject("GET", storageKey);
    if (!(response instanceof Buffer)) throw new InternalServerErrorException("Unable to read stored file");
    return response;
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
    try { await this.requestObject("HEAD", storageKey); return true; } catch { return false; }
  }

  getAbsolutePath(storageKey: string): string {
    if (this.provider !== "local") throw new BadRequestException("Remote storage does not expose local paths");
    const normalizedKey = storageKey.replace(/\\/g, "/");
    const absolutePath = resolve(this.root, normalizedKey);
    if (absolutePath !== this.root && !absolutePath.startsWith(`${this.root}${sep}`)) throw new BadRequestException("Invalid storage key");
    return absolutePath;
  }

  private async putObject(key: string, body: Buffer, contentType: string, cacheControl?: string) { await this.requestObject("PUT", key, body, contentType, cacheControl); }
  private async deleteObject(key: string) { await this.requestObject("DELETE", key); }

  private async requestObjectResponse(method: "GET" | "HEAD", key: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
    const hostUrl = `${this.endpoint}/${encodeURIComponent(this.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const url = new URL(hostUrl);
    const payloadHash = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = {
      host: url.host,
      ...extraHeaders,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((name) => `${name}:${headers[name].trim()}\n`)
      .join("");
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

    const response = await fetch(url, { method, headers });
    if (!response.ok) {
      throw new InternalServerErrorException(`Remote storage request failed (${response.status})`);
    }
    return response;
  }

  private async requestObject(method: "PUT" | "DELETE" | "HEAD" | "GET", key: string, body?: Buffer, contentType?: string, cacheControl?: string): Promise<Buffer | void> {
    const hostUrl = `${this.endpoint}/${encodeURIComponent(this.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const url = new URL(hostUrl);
    const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
    if (contentType) headers["content-type"] = contentType;
    if (cacheControl) headers["cache-control"] = cacheControl;
    const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name].trim()}\n`).join("");
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const signingKey = this.deriveSigningKey(dateStamp);
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, { method, headers, body: method === "PUT" ? new Uint8Array(body ?? Buffer.alloc(0)) : undefined });
    if (!response.ok && !(method === "DELETE" && response.status === 404)) throw new InternalServerErrorException(`Remote storage request failed (${response.status})`);
    if (method === "GET") return Buffer.from(await response.arrayBuffer());
  }

  private deriveSigningKey(dateStamp: string) {
    const kDate = createHmac("sha256", `AWS4${this.secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }

  private contentType(extension: string) {
    const types: Record<string, string> = { ".glb":"model/gltf-binary",".gltf":"model/gltf+json",".bin":"application/octet-stream",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".pdf":"application/pdf",".obj":"text/plain",".mtl":"text/plain",".svg":"image/svg+xml" };
    return types[extension] ?? "application/octet-stream";
  }

  private normalizePathSegment(value: string, name: string): string {
    const normalized = value.trim();
    if (
      !normalized ||
      normalized === "." ||
      normalized === ".." ||
      normalized.includes("/") ||
      normalized.includes("\\") ||
      normalized.includes("\u0000")
    ) {
      throw new BadRequestException(`Invalid ${name}`);
    }
    return normalized;
  }
}