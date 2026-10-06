import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const PART_SIZE = 8 * 1024 * 1024;
const MAX_SIZE = Number(process.env.MAX_MODEL_MB ?? 150) * 1024 * 1024;

type UploadPart = { PartNumber: number; ETag: string };

@Injectable()
export class ModelMultipartService {
  private readonly bucket = process.env.STORAGE_BUCKET ?? "";
  private readonly endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
  private readonly accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  private readonly secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";
  private readonly region = process.env.STORAGE_REGION ?? "us-east-1";

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private assertConfigured() {
    if (!this.bucket || !this.endpoint || !this.accessKey || !this.secretKey) {
      throw new BadRequestException("Remote storage is not configured");
    }
  }

  async start(productId: string, size: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) throw new NotFoundException("Product not found");

    if (
      !Number.isInteger(size) ||
      size < 12 ||
      size > MAX_SIZE
    ) {
      throw new BadRequestException(
        `GLB size must be between 12 bytes and ${MAX_SIZE / (1024 * 1024)} MB`,
      );
    }

    this.assertConfigured();

    const key = `products/${productId}/models/${randomUUID()}.glb`;
    const uploadId = await this.createMultipartUpload(key);
    const total = Math.ceil(size / PART_SIZE);

    const parts = await Promise.all(
      Array.from({ length: total }, async (_, index) => ({
        partNumber: index + 1,
        url: await this.presignUploadPart(key, uploadId, index + 1),
      })),
    );

    return {
      key,
      uploadId,
      partSize: PART_SIZE,
      parts,
    };
  }

  async complete(
    productId: string,
    body: {
      key: string;
      uploadId: string;
      size: number;
      originalName: string;
      parts: UploadPart[];
    },
  ) {
    this.assertConfigured();

    const prefix = `products/${productId}/models/`;
    const filename = body?.key?.slice(prefix.length) ?? "";

    if (
      !body?.key?.startsWith(prefix) ||
      !/^[A-Za-z0-9_-]+\.glb$/.test(filename)
    ) {
      throw new BadRequestException("Invalid model storage key");
    }

    if (
      !body.uploadId ||
      !Number.isInteger(body.size) ||
      body.size < 12 ||
      body.size > MAX_SIZE ||
      !Array.isArray(body.parts) ||
      body.parts.length === 0
    ) {
      throw new BadRequestException("Invalid multipart completion request");
    }

    const expectedParts = Math.ceil(body.size / PART_SIZE);
    if (body.parts.length !== expectedParts) {
      throw new BadRequestException("Multipart part count does not match file size");
    }

    const parts = [...body.parts]
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map((part) => ({
        PartNumber: Number(part.PartNumber),
        ETag: String(part.ETag),
      }));

    if (
      parts.some(
        (part, index) =>
          part.PartNumber !== index + 1 ||
          !part.ETag ||
          part.ETag.length > 256,
      )
    ) {
      throw new BadRequestException("Invalid multipart ETags");
    }

    try {
      await this.completeMultipartUpload(body.key, body.uploadId, parts);

      const head = await this.headObject(body.key);
      const uploadedSize = Number(head.get("content-length") ?? NaN);

      if (!Number.isFinite(uploadedSize) || uploadedSize !== body.size) {
        throw new BadRequestException("Uploaded size does not match");
      }

      const header = await this.readGlbHeader(body.key);
      const declaredLength = header.readUInt32LE(8);

      if (
        header.length < 12 ||
        header.toString("ascii", 0, 4) !== "glTF" ||
        declaredLength !== uploadedSize
      ) {
        throw new BadRequestException("Not a valid or complete GLB file");
      }
    } catch (error) {
      await this.abortMultipartUpload(body.key, body.uploadId).catch(() => undefined);
      await this.storage.delete(body.key).catch(() => undefined);
      throw error;
    }

    const url = `/api/assets/${body.key
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const file = await tx.productFile.create({
        data: {
          productId,
          originalName: body.originalName?.trim() || "model.glb",
          storageKey: body.key,
          storageUrl: url,
          format: "GLB",
          fileType: "MODEL",
          mimeType: "model/gltf-binary",
          fileSize: BigInt(body.size),
          processingStatus: "PENDING",
        },
      });

      // Every admin-uploaded GLB goes through the same optimization worker.
      // The existing published model remains untouched until the optimized
      // replacement is ready and atomically published.
      await tx.productFileProcessingJob.create({
        data: {
          productFileId: file.id,
          status: "QUEUED",
          attempts: 0,
          maxAttempts: 3,
        },
      });

      return file;
    });

    return {
      id: created.id,
      url: null,
      size: body.size,
      originalName: body.originalName?.trim() || "model.glb",
      processingStatus: "PENDING",
    };
  }

  async abort(
    productId: string,
    body: { key: string; uploadId: string },
  ) {
    this.assertConfigured();

    const prefix = `products/${productId}/models/`;
    const filename = body?.key?.slice(prefix.length) ?? "";

    if (
      !body?.key?.startsWith(prefix) ||
      !/^[A-Za-z0-9_-]+\.glb$/.test(filename) ||
      !body.uploadId
    ) {
      throw new BadRequestException("Invalid multipart abort request");
    }

    await this.abortMultipartUpload(body.key, body.uploadId);
    await this.storage.delete(body.key).catch(() => undefined);

    return { aborted: true };
  }

  private objectUrl(key: string): URL {
    const url = new URL(
      `${this.endpoint}/${this.awsEncode(this.bucket)}/${key
        .split("/")
        .map((segment) => this.awsEncode(segment))
        .join("/")}`,
    );
    return url;
  }

  private awsEncode(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  private canonicalQuery(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${this.awsEncode(key)}=${this.awsEncode(value)}`)
      .join("&");
  }

  private signingKey(dateStamp: string): Buffer {
    const kDate = createHmac("sha256", `AWS4${this.secretKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }

  private signRequest(
    method: string,
    url: URL,
    payloadHash: string,
    headers: Record<string, string>,
    query: Record<string, string> = {},
  ) {
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const allHeaders = {
      host: url.host,
      ...headers,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    const canonicalHeaders = Object.keys(allHeaders)
      .sort()
      .map((name) => `${name.toLowerCase()}:${allHeaders[name].trim()}\n`)
      .join("");

    const signedHeaders = Object.keys(allHeaders)
      .map((name) => name.toLowerCase())
      .sort()
      .join(";");

    const canonicalRequest = [
      method,
      url.pathname,
      this.canonicalQuery(query),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signature = createHmac("sha256", this.signingKey(dateStamp))
      .update(stringToSign)
      .digest("hex");

    return {
      amzDate,
      credentialScope,
      signedHeaders,
      signature,
      headers: allHeaders,
    };
  }

  /**
   * Convert a failed B2/S3 response into a useful API error. B2 returns
   * S3-compatible XML with Code/Message and request IDs.
   */
  private async storageFailure(action: string, response: Response): Promise<BadGatewayException> {
    let body = "";
    try { body = (await response.text()).trim(); } catch { /* ignore */ }
    const code = /<Code>([^<]+)<\/Code>/i.exec(body)?.[1];
    const message = /<Message>([^<]+)<\/Message>/i.exec(body)?.[1];
    const requestId =
      response.headers.get("x-amz-request-id") ??
      response.headers.get("x-bz-request-id") ??
      undefined;
    const detail = code && message ? `${code}: ${message}` : code ?? message ?? body.slice(0, 200);
    return new BadGatewayException(
      `${action} failed (${response.status})${detail ? `: ${detail}` : ""}${requestId ? ` [requestId: ${requestId}]` : ""}`,
    );
  }

  private async createMultipartUpload(key: string): Promise<string> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    // Backblaze's CreateMultipartUpload request only requires the
    // uploads query parameter. Keep the signed header set minimal so
    // provider-specific metadata headers cannot cause SigV4 mismatches.
    const signed = this.signRequest(
      "POST",
      url,
      payloadHash,
      {},
      { uploads: "null" },
    );

    // For the initial multipart request, use the normal Authorization header
    // rather than a presigned query so providers only need standard SigV4 support.
    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${signed.credentialScope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;
    const response = await fetch(`${url}?uploads=null`, {
      method: "POST",
      headers: {
        ...signed.headers,
        authorization: auth,
      },
    });

    if (!response.ok) {
      throw await this.storageFailure("Start multipart upload", response);
    }

    const xml = await response.text();
    const uploadId = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
    if (!uploadId) {
      throw new Error("Storage did not return a multipart upload ID");
    }

    return uploadId;
  }

  private async presignUploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<string> {
    const url = this.objectUrl(key);
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

    const canonicalRequest = [
      "PUT",
      url.pathname,
      this.canonicalQuery(query),
      `host:${url.host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signature = createHmac("sha256", this.signingKey(dateStamp))
      .update(stringToSign)
      .digest("hex");

    return `${url.origin}${url.pathname}?${this.canonicalQuery({
      ...query,
      "X-Amz-Signature": signature,
    })}`;
  }

  private async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: UploadPart[],
  ): Promise<void> {
    const url = this.objectUrl(key);
    const xml = `<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>${parts
      .map(
        (part) =>
          `<Part><PartNumber>${part.PartNumber}</PartNumber><ETag>${this.escapeXml(part.ETag)}</ETag></Part>`,
      )
      .join("")}</CompleteMultipartUpload>`;
    const body = Buffer.from(xml);
    const payloadHash = createHash("sha256").update(body).digest("hex");

    const signed = this.signRequest(
      "POST",
      url,
      payloadHash,
      { "content-type": "application/xml" },
      { uploadId },
    );

    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${signed.credentialScope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;

    const response = await fetch(`${url}?${this.canonicalQuery({ uploadId })}`, {
      method: "POST",
      headers: {
        ...signed.headers,
        authorization: auth,
      },
      body,
    });

    if (!response.ok) {
      throw await this.storageFailure("Complete multipart upload", response);
    }
  }

  private async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    const signed = this.signRequest(
      "DELETE",
      url,
      payloadHash,
      {},
      { uploadId },
    );

    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${signed.credentialScope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;

    await fetch(`${url}?${this.canonicalQuery({ uploadId })}`, {
      method: "DELETE",
      headers: { ...signed.headers, authorization: auth },
    });
  }

  private async headObject(key: string): Promise<Headers> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    const signed = this.signRequest("HEAD", url, payloadHash, {});

    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${signed.credentialScope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;

    const response = await fetch(url, {
      method: "HEAD",
      headers: { ...signed.headers, authorization: auth },
    });

    if (!response.ok) throw await this.storageFailure("Inspect uploaded model", response);
    return response.headers;
  }

  private async readGlbHeader(key: string): Promise<Buffer> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    const signed = this.signRequest(
      "GET",
      url,
      payloadHash,
      { range: "bytes=0-11" },
    );

    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${signed.credentialScope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...signed.headers,
        range: "bytes=0-11",
        authorization: auth,
      },
    });

    if (!response.ok) throw await this.storageFailure("Read uploaded GLB header", response);
    return Buffer.from(await response.arrayBuffer());
  }

  private escapeXml(value: string): string {
    return value.replace(/[<>&'"]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      };
      return entities[char];
    });
  }
}
