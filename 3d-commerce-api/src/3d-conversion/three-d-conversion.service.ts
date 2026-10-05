import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProcessingJobStatus } from "@prisma/client";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { THREE_D_CONVERSION_EXTENSION_SET, THREE_D_CONVERSION_MAX_BYTES } from "./three-d-conversion.constants";

const PART_SIZE = 8 * 1024 * 1024;
type UploadPart = { PartNumber: number; ETag: string };

@Injectable()
export class ThreeDConversionService {
  private readonly bucket = process.env.STORAGE_BUCKET ?? "";
  private readonly endpoint = (process.env.STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
  private readonly accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? "";
  private readonly secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? "";
  private readonly region = process.env.STORAGE_REGION ?? "us-east-1";

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private assertConfigured() {
    if (!this.bucket || !this.endpoint || !this.accessKey || !this.secretKey) {
      throw new BadRequestException("Remote storage is not configured");
    }
  }

  async start(originalName: string, size: number, createdById?: string) {
    const name = originalName?.trim();
    if (!name) throw new BadRequestException("Original filename is required");
    if (!Number.isInteger(size) || size <= 0 || size > THREE_D_CONVERSION_MAX_BYTES) {
      throw new BadRequestException(
        "3D conversion input must be between 1 byte and " +
          THREE_D_CONVERSION_MAX_BYTES / (1024 * 1024) +
          " MB",
      );
    }

    const inputExt = extname(name).toLowerCase();
    if (!THREE_D_CONVERSION_EXTENSION_SET.has(inputExt)) {
      throw new BadRequestException("Unsupported 3D conversion format: " + (inputExt || "unknown"));
    }

    this.assertConfigured();

    const job = await this.prisma.threeDConversionJob.create({
      data: {
        originalName: name.slice(0, 255),
        sourceStorageKey: "pending",
        inputExt,
        status: ProcessingJobStatus.PROCESSING,
        createdById: createdById ?? null,
      },
    });

    const key = "conversions/" + job.id + "/source/" + randomUUID() + inputExt;
    await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: { sourceStorageKey: key },
    });

    try {
      const uploadId = await this.createMultipartUpload(key);
      const total = Math.ceil(size / PART_SIZE);
      const parts = await Promise.all(
        Array.from({ length: total }, async (_, index) => ({
          partNumber: index + 1,
          url: await this.presignUploadPart(key, uploadId, index + 1),
        })),
      );
      return { jobId: job.id, key, uploadId, partSize: PART_SIZE, parts };
    } catch (error) {
      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          status: ProcessingJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  async complete(
    jobId: string,
    body: { key: string; uploadId: string; size: number; parts: UploadPart[] },
  ) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.PROCESSING) {
      throw new BadRequestException("Conversion upload is not active");
    }
    if (body?.key !== job.sourceStorageKey || !body.uploadId) {
      throw new BadRequestException("Invalid conversion upload session");
    }
    if (
      !Number.isInteger(body.size) ||
      body.size <= 0 ||
      body.size > THREE_D_CONVERSION_MAX_BYTES
    ) {
      throw new BadRequestException("Invalid uploaded size");
    }

    const expectedParts = Math.ceil(body.size / PART_SIZE);
    if (!Array.isArray(body.parts) || body.parts.length !== expectedParts) {
      throw new BadRequestException("Multipart part count does not match file size");
    }

    const parts = [...body.parts]
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map((part) => ({ PartNumber: Number(part.PartNumber), ETag: String(part.ETag) }));

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
      await this.completeMultipartUpload(job.sourceStorageKey, body.uploadId, parts);
      const uploadedSize = await this.storage.getObjectSize(job.sourceStorageKey);
      if (uploadedSize !== body.size) throw new BadRequestException("Uploaded size does not match");
    } catch (error) {
      await this.abortMultipartUpload(job.sourceStorageKey, body.uploadId).catch(() => undefined);
      await this.storage.delete(job.sourceStorageKey).catch(() => undefined);
      await this.prisma.threeDConversionJob.update({
        where: { id: job.id },
        data: {
          status: ProcessingJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      }).catch(() => undefined);
      throw error;
    }

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: {
        status: ProcessingJobStatus.QUEUED,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    return this.serialize(updated);
  }

  async abort(jobId: string, uploadId: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.PROCESSING) {
      throw new BadRequestException("Conversion upload is not active");
    }

    await this.abortMultipartUpload(job.sourceStorageKey, uploadId).catch(() => undefined);
    await this.storage.delete(job.sourceStorageKey).catch(() => undefined);

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id: job.id },
      data: {
        status: ProcessingJobStatus.FAILED,
        errorMessage: "Upload cancelled",
        completedAt: new Date(),
      },
    });
    return this.serialize(updated);
  }

  async findAll() {
    const jobs = await this.prisma.threeDConversionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jobs.map((job) => this.serialize(job));
  }

  async findOne(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    return this.serialize(job);
  }

  async retry(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.FAILED) {
      throw new BadRequestException("Only failed conversion jobs can be retried");
    }
    if (!(await this.storage.exists(job.sourceStorageKey))) {
      throw new BadRequestException("Original source file is no longer available");
    }
    if (job.outputStorageKey) {
      await this.storage.delete(job.outputStorageKey).catch(() => undefined);
    }

    const updated = await this.prisma.threeDConversionJob.update({
      where: { id },
      data: {
        status: ProcessingJobStatus.QUEUED,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        outputStorageKey: null,
        outputSize: null,
      },
    });
    return this.serialize(updated);
  }

  async remove(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    await this.prisma.threeDConversionJob.delete({ where: { id } });
    await this.storage.delete(job.sourceStorageKey).catch(() => undefined);
    if (job.outputStorageKey) await this.storage.delete(job.outputStorageKey).catch(() => undefined);
    return { deleted: true };
  }

  async download(id: string) {
    const job = await this.prisma.threeDConversionJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Conversion job not found");
    if (job.status !== ProcessingJobStatus.COMPLETED || !job.outputStorageKey) {
      throw new NotFoundException("Converted GLB is not ready");
    }
    const stream = await this.storage.createReadStream(job.outputStorageKey);
    return { stream, filename: this.outputName(job.originalName) };
  }

  serialize(job: any) {
    return {
      ...job,
      outputSize: job.outputSize == null ? null : job.outputSize.toString(),
    };
  }

  private outputName(originalName: string) {
    const base =
      originalName.replace(/\\/g, "/").split("/").pop()?.replace(/\.[^.]+$/, "") || "model";
    return base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) + ".glb";
  }

  private objectUrl(key: string): URL {
    return new URL(
      this.endpoint +
        "/" +
        encodeURIComponent(this.bucket) +
        "/" +
        key.split("/").map(encodeURIComponent).join("/"),
    );
  }

  private awsEncode(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
      "%" + char.charCodeAt(0).toString(16).toUpperCase(),
    );
  }

  private canonicalQuery(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => this.awsEncode(key) + "=" + this.awsEncode(value))
      .join("&");
  }

  private signingKey(dateStamp: string): Buffer {
    const kDate = createHmac("sha256", "AWS4" + this.secretKey).update(dateStamp).digest();
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
    const credentialScope = dateStamp + "/" + this.region + "/s3/aws4_request";
    const allHeaders = {
      host: url.host,
      ...headers,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    const canonicalHeaders = Object.keys(allHeaders)
      .sort()
      .map((name) => name.toLowerCase() + ":" + allHeaders[name].trim() + "\n")
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
      credentialScope,
      signedHeaders,
      signature,
      headers: allHeaders,
    };
  }

  private async createMultipartUpload(key: string): Promise<string> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    const signed = this.signRequest(
      "POST",
      url,
      payloadHash,
      { "cache-control": "private, max-age=0, no-cache", "content-type": "application/octet-stream" },
      { uploads: "" },
    );
    const auth =
      "AWS4-HMAC-SHA256 Credential=" +
      this.accessKey +
      "/" +
      signed.credentialScope +
      ", SignedHeaders=" +
      signed.signedHeaders +
      ", Signature=" +
      signed.signature;

    const response = await fetch(url.toString() + "?uploads=", {
      method: "POST",
      headers: { ...signed.headers, authorization: auth },
    });
    if (!response.ok) throw new Error("Unable to start multipart upload (" + response.status + ")");
    const xml = await response.text();
    const uploadId = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
    if (!uploadId) throw new Error("Storage did not return a multipart upload ID");
    return uploadId;
  }

  private async presignUploadPart(key: string, uploadId: string, partNumber: number): Promise<string> {
    const url = this.objectUrl(key);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = dateStamp + "/" + this.region + "/s3/aws4_request";
    const query = {
      partNumber: String(partNumber),
      uploadId,
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": this.accessKey + "/" + credentialScope,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "3600",
      "X-Amz-SignedHeaders": "host",
    };
    const canonicalRequest = [
      "PUT",
      url.pathname,
      this.canonicalQuery(query),
      "host:" + url.host + "\n",
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
    return (
      url.origin +
      url.pathname +
      "?" +
      this.canonicalQuery({ ...query, "X-Amz-Signature": signature })
    );
  }

  private async completeMultipartUpload(key: string, uploadId: string, parts: UploadPart[]): Promise<void> {
    const url = this.objectUrl(key);
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>' +
      parts
        .map(
          (part) =>
            "<Part><PartNumber>" +
            part.PartNumber +
            "</PartNumber><ETag>" +
            this.escapeXml(part.ETag) +
            "</ETag></Part>",
        )
        .join("") +
      "</CompleteMultipartUpload>";
    const body = Buffer.from(xml);
    const payloadHash = createHash("sha256").update(body).digest("hex");
    const signed = this.signRequest(
      "POST",
      url,
      payloadHash,
      { "content-type": "application/xml" },
      { uploadId },
    );
    const auth =
      "AWS4-HMAC-SHA256 Credential=" +
      this.accessKey +
      "/" +
      signed.credentialScope +
      ", SignedHeaders=" +
      signed.signedHeaders +
      ", Signature=" +
      signed.signature;

    const response = await fetch(
      url.toString() + "?" + this.canonicalQuery({ uploadId }),
      { method: "POST", headers: { ...signed.headers, authorization: auth }, body },
    );
    if (!response.ok) throw new Error("Unable to complete multipart upload (" + response.status + ")");
  }

  private async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const url = this.objectUrl(key);
    const payloadHash = createHash("sha256").update("").digest("hex");
    const signed = this.signRequest("DELETE", url, payloadHash, {}, { uploadId });
    const auth =
      "AWS4-HMAC-SHA256 Credential=" +
      this.accessKey +
      "/" +
      signed.credentialScope +
      ", SignedHeaders=" +
      signed.signedHeaders +
      ", Signature=" +
      signed.signature;
    await fetch(
      url.toString() + "?" + this.canonicalQuery({ uploadId }),
      { method: "DELETE", headers: { ...signed.headers, authorization: auth } },
    );
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
