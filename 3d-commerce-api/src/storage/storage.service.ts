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
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import type { SaveProductFileOptions, StoredFile } from "./storage.types";

type StorageProvider = "local" | "s3" | "b2";
type MultipartUploadPart = { PartNumber: number; ETag: string };

const awsEncodeSegment = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider = ((process.env.STORAGE_PROVIDER ?? "local").toLowerCase() === "r2" || (process.env.STORAGE_PROVIDER ?? "local").toLowerCase() === "b2" ? "s3" : (process.env.STORAGE_PROVIDER ?? "local").toLowerCase()) as StorageProvider;
  private readonly root = resolve(process.env.STORAGE_ROOT ?? join(process.cwd(), "storage"));
  private readonly bucket = process.env.STORAGE_BUCKET ?? "";
  private readonly endpoint = (process.env.STORAGE_ENDPOINT ?? "").trim().replace(/^[\"\']|[\"\']$/g, "").trim().replace(/\/+$/, "");
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

  async saveCustomBuildCategoryImage(categoryId: string, originalName: string, buffer: Buffer): Promise<StoredFile> {
    return this.saveScopedFile(
      ["custom-build-categories", categoryId.trim()],
      originalName.trim(),
      buffer,
      true,
    );
  }

  async saveCustomBuildOptionImage(optionId: string, originalName: string, buffer: Buffer): Promise<StoredFile> {
    return this.saveScopedFile(
      ["custom-build-options", optionId.trim()],
      originalName.trim(),
      buffer,
      true,
    );
  }
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
    if (info.size === 0) throw new InternalServerErrorException(`Refusing to upload empty file for ${normalizedKey}`);

    if (this.provider === "local") {
      const destination = this.getAbsolutePath(normalizedKey);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(sourcePath, destination);
      return info.size;
    }

    const buffer = await readFile(sourcePath);
    await this.putObject(normalizedKey, buffer, contentType, "private, max-age=0, no-cache");
    const remoteSize = await this.getObjectSize(normalizedKey);
    if (remoteSize !== buffer.length) {
      await this.deleteObject(normalizedKey).catch(() => undefined);
      throw new BadGatewayException(`Upload verification failed for ${normalizedKey}: sent ${buffer.length} bytes, storage has ${remoteSize}`);
    }
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


  async createMultipartUpload(storageKey: string): Promise<string> {
    if (this.provider !== "s3") throw new BadRequestException("Multipart uploads require S3-compatible remote storage");
    const key = this.normalizeRemoteKey(storageKey);
    const url = this.multipartObjectUrl(key);
    const signed = this.signMultipartRequest("POST", url, createHash("sha256").update("").digest("hex"), {
      "cache-control": "private, max-age=0, no-cache",
      "content-type": "application/octet-stream",
    }, { uploads: "" });

    const response = await fetch(url.toString() + "?uploads=", {
      method: "POST",
      headers: { ...signed.headers, authorization: signed.authorization },
    });
    if (!response.ok) throw new BadGatewayException(`Unable to start multipart upload (${response.status}): ${await this.readRemoteError(response)}`);
    const uploadId = (await response.text()).match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
    if (!uploadId) throw new BadGatewayException("Storage did not return a multipart upload ID");
    return uploadId;
  }

  presignMultipartPart(storageKey: string, uploadId: string, partNumber: number): string {
    if (this.provider !== "s3") throw new BadRequestException("Multipart uploads require S3-compatible remote storage");
    if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1) throw new BadRequestException("Invalid multipart upload part");

    const url = this.multipartObjectUrl(this.normalizeRemoteKey(storageKey));
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const query = {
      partNumber: String(partNumber),
      uploadId,
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.accessKey}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "3600",
      "X-Amz-SignedHeaders": "host",
    };
    const canonicalRequest = ["PUT", url.pathname, this.multipartCanonicalQuery(query), "host:" + url.host + "\n", "host", "UNSIGNED-PAYLOAD"].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const signature = createHmac("sha256", this.deriveMultipartSigningKey(dateStamp)).update(stringToSign).digest("hex");

    return url.origin + url.pathname + "?" + this.multipartCanonicalQuery({ ...query, "X-Amz-Signature": signature });
  }

  async completeMultipartUpload(storageKey: string, uploadId: string, parts: MultipartUploadPart[]): Promise<void> {
    if (this.provider !== "s3") throw new BadRequestException("Multipart uploads require S3-compatible remote storage");
    const url = this.multipartObjectUrl(this.normalizeRemoteKey(storageKey));
    const xml = '<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>' +
      parts.map((part) => "<Part><PartNumber>" + part.PartNumber + "</PartNumber><ETag>" + this.escapeMultipartXml(part.ETag) + "</ETag></Part>").join("") +
      "</CompleteMultipartUpload>";
    const body = Buffer.from(xml);
    const signed = this.signMultipartRequest("POST", url, createHash("sha256").update(body).digest("hex"), { "content-type": "application/xml" }, { uploadId });

    const response = await fetch(url.toString() + "?" + this.multipartCanonicalQuery({ uploadId }), {
      method: "POST",
      headers: { ...signed.headers, authorization: signed.authorization },
      body,
    });
    if (!response.ok) throw new BadGatewayException(`Unable to complete multipart upload (${response.status}): ${await this.readRemoteError(response)}`);
  }

  async abortMultipartUpload(storageKey: string, uploadId: string): Promise<void> {
    if (this.provider !== "s3") return;
    const url = this.multipartObjectUrl(this.normalizeRemoteKey(storageKey));
    const signed = this.signMultipartRequest("DELETE", url, createHash("sha256").update("").digest("hex"), {}, { uploadId });
    const response = await fetch(url.toString() + "?" + this.multipartCanonicalQuery({ uploadId }), {
      method: "DELETE",
      headers: { ...signed.headers, authorization: signed.authorization },
    });
    if (!response.ok && response.status !== 404) throw new BadGatewayException(`Unable to abort multipart upload (${response.status}): ${await this.readRemoteError(response)}`);
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

  /**
   * Copy an object inside the storage provider without downloading it through
   * the API process. This is used when publishing an optimized GLB to its
   * immutable product URL.
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const source = this.normalizeRemoteKey(sourceKey);
    const destination = this.normalizeRemoteKey(destinationKey);

    if (this.provider === "local") {
      const { copyFile } = await import("node:fs/promises");
      const destinationPath = this.getAbsolutePath(destination);
      await mkdir(dirname(destinationPath), { recursive: true });
      await copyFile(this.getAbsolutePath(source), destinationPath);
      return;
    }

    const copySource = "/" + this.bucket + "/" + source.split("/").map(awsEncodeSegment).join("/");
    const { url, headers } = this.buildSignedRequest(
      "PUT",
      destination,
      undefined,
      { "x-amz-copy-source": copySource },
    );

    const response = await fetch(url, { method: "PUT", headers });
    const body = await response.text();
    if (!response.ok || /<Error\b/i.test(body) || /<Code>[^<]+<\/Code>/i.test(body)) {
      const detail = body.trim() || `HTTP ${response.status}`;
      throw new BadGatewayException(
        `Remote storage copy failed (${response.status}): ${detail.slice(0, 2000)}`,
      );
    }

    const [sourceSize, destinationSize] = await Promise.all([
      this.getObjectSize(source),
      this.getObjectSize(destination),
    ]);
    if (destinationSize !== sourceSize) {
      await this.deleteObject(destination).catch(() => undefined);
      throw new BadGatewayException(
        `Remote storage copy verification failed: expected ${sourceSize} bytes, got ${destinationSize}`,
      );
    }
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


  private multipartObjectUrl(storageKey: string): URL {
    return new URL(this.endpoint + "/" + encodeURIComponent(this.bucket) + "/" + storageKey.split("/").map(encodeURIComponent).join("/"));
  }

  private multipartCanonicalQuery(params: Record<string, string>): string {
    // SigV4 sorts the URI-encoded query keys by byte/ASCII order, not locale order.
    // localeCompare() can place lowercase keys before uppercase X-Amz-* keys,
    // producing a signature that B2 rejects even though the URL looks valid.
    return Object.entries(params)
      .map(([key, value]) => [awsEncodeSegment(key), awsEncodeSegment(value)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => key + "=" + value)
      .join("&");
  }

  private deriveMultipartSigningKey(dateStamp: string): Buffer {
    const kDate = createHmac("sha256", "AWS4" + this.secretKey).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }

  private signMultipartRequest(
    method: "POST" | "DELETE",
    url: URL,
    payloadHash: string,
    headers: Record<string, string>,
    query: Record<string, string> = {},
  ) {
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const allHeaders = { host: url.host, ...headers, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
    const canonicalHeaders = Object.keys(allHeaders).sort().map((name) => name.toLowerCase() + ":" + allHeaders[name].trim() + "\n").join("");
    const signedHeaders = Object.keys(allHeaders).map((name) => name.toLowerCase()).sort().join(";");
    const canonicalRequest = [method, url.pathname, this.multipartCanonicalQuery(query), canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const signature = createHmac("sha256", this.deriveMultipartSigningKey(dateStamp)).update(stringToSign).digest("hex");
    return {
      authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      headers: allHeaders,
    };
  }

  private escapeMultipartXml(value: string): string {
    return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
  }

  private async putObject(key: string, body: Buffer, contentType: string, cacheControl?: string) { await this.requestObject("PUT", key, body, contentType, cacheControl); }
  private async deleteObject(key: string) { await this.requestObject("DELETE", key); }

  private buildSignedRequest(
    method: "PUT" | "DELETE" | "HEAD" | "GET",
    key: string,
    body?: Buffer,
    extraHeaders: Record<string, string> = {},
  ): { url: URL; headers: Record<string, string> } {
    const normalizedKey = this.normalizeRemoteKey(key);
    const hostUrl = `${this.endpoint}/${awsEncodeSegment(this.bucket)}/${normalizedKey
      .split("/")
      .map(awsEncodeSegment)
      .join("/")}`;
    const url = new URL(hostUrl);
    const payload = body ?? Buffer.alloc(0);
    const payloadHash = createHash("sha256").update(payload).digest("hex");
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
      .map((name) => `${name.toLowerCase()}:${headers[name].trim()}\n`)
      .join("");
    const signedHeaders = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort()
      .join(";");

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
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { url, headers };
  }

  private async readRemoteError(response: Response): Promise<string> {
    const requestId =
      response.headers.get("x-amz-request-id") ??
      response.headers.get("x-bz-request-id") ??
      undefined;

    let body = "";
    try {
      body = (await response.text()).trim();
    } catch {
      // Ignore a response body that cannot be read.
    }

    // B2 returns S3-style XML errors. Keep only diagnostic fields so secrets
    // or large upstream responses are never copied into our API error.
    const code = /<Code>([^<]+)<\/Code>/i.exec(body)?.[1];
    const message = /<Message>([^<]+)<\/Message>/i.exec(body)?.[1];
    const detail = code && message
      ? `${code}: ${message}`
      : code ?? message ?? body.replace(/\s+/g, " ").slice(0, 300);

    return requestId ? `${detail || "Remote storage request failed"} [requestId: ${requestId}]` : detail || "Remote storage request failed";
  }

  private async requestObjectResponse(
    method: "GET" | "HEAD",
    key: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    const { url, headers } = this.buildSignedRequest(method, key, undefined, extraHeaders);
    const response = await fetch(url, { method, headers });

    if (!response.ok) {
      const detail = await this.readRemoteError(response);
      if (response.status === 404) {
        throw new NotFoundException(`Stored file not found: ${detail}`);
      }
      throw new BadGatewayException(
        `Remote storage request failed (${response.status}): ${detail}`,
      );
    }

    return response;
  }

  private async requestObject(
    method: "PUT" | "DELETE" | "HEAD" | "GET",
    key: string,
    body?: Buffer,
    contentType?: string,
    cacheControl?: string,
  ): Promise<Buffer | void> {
    const extraHeaders: Record<string, string> = {};
    if (contentType) extraHeaders["content-type"] = contentType;
    if (cacheControl) extraHeaders["cache-control"] = cacheControl;

    const { url, headers } = this.buildSignedRequest(method, key, body, extraHeaders);
    const response = await fetch(url, {
      method,
      headers,
      body: method === "PUT" ? new Uint8Array(body ?? Buffer.alloc(0)) : undefined,
    });

    if (!response.ok && !(method === "DELETE" && response.status === 404)) {
      const detail = await this.readRemoteError(response);
      throw new BadGatewayException(
        `Remote storage request failed (${response.status}): ${detail}`,
      );
    }

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