import {
  BadGatewayException,
  Controller,
  HttpException,
  HttpStatus,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage.service";

@Controller(["assets", "api/assets"])
export class AssetController {
  private readonly logger = new Logger(AssetController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get("categories/*")
  async getCategoryAsset(
    @Param() params: Record<string, string | undefined>,
  ): Promise<StreamableFile> {
    const wildcard = params["splat"] ?? params["*"] ?? params["0"] ?? "";
    const normalized = decodeURIComponent(wildcard).replace(/^\/+/, "");

    if (!normalized || normalized.includes("\0")) {
      throw new NotFoundException("Asset not found");
    }

    const segments = normalized.split("/");
    if (
      segments.length < 2 ||
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("\\"),
      )
    ) {
      throw new NotFoundException("Asset not found");
    }

    const [categoryId, ...rest] = segments;
    const storageKey = ["categories", categoryId, ...rest].join("/");
    const assetUrl =
      "/api/assets/" +
      storageKey.split("/").map(encodeURIComponent).join("/");

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { imageUrl: true },
    });

    if (!category || category.imageUrl !== assetUrl) {
      throw new NotFoundException("Asset not found");
    }

    try {
      const stream = await this.storage.createReadStream(storageKey);
      return new StreamableFile(stream, {
        type: this.storage.getContentTypeForStorageKey(storageKey),
      });
    } catch {
      throw new NotFoundException("Asset not found");
    }
  }

  @Get("products/*")
  async getProductAsset(
    @Param() params: Record<string, string | undefined>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const wildcard = params["splat"] ?? params["*"] ?? params["0"] ?? "";
    const normalized = decodeURIComponent(wildcard).replace(/^\/+/, "");

    if (!normalized || normalized.includes("\0")) {
      throw new NotFoundException("Asset not found");
    }

    const segments = normalized.split("/");
    if (
      segments.length < 2 ||
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("\\"),
      )
    ) {
      throw new NotFoundException("Asset not found");
    }

    const [productId, ...rest] = segments;
    const storageKey = ["products", productId, ...rest].join("/");
    const assetUrl = "/api/assets/" + storageKey.split("/").map(encodeURIComponent).join("/");

    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: { in: ["ACTIVE", "DRAFT"] } },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Asset not found");

    try {
      const range = String(reply.request.headers.range ?? "").trim();
      const contentType = this.storage.getContentTypeForStorageKey(storageKey);

      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Cross-Origin-Resource-Policy", "cross-origin");
      reply.header(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range, Accept-Ranges",
      );
      reply.header("Accept-Ranges", "bytes");

      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) {
          return reply
            .code(416)
            .header("Content-Range", "bytes */0")
            .send({ error: "Invalid byte range" });
        }

        const start = Number(match[1]);

        const requestedEnd = match[2] ? Number(match[2]) : undefined;
        if (
          !Number.isSafeInteger(start) ||
          start < 0 ||
          (requestedEnd !== undefined &&
            (!Number.isSafeInteger(requestedEnd) || requestedEnd < start))
        ) {
          reply.header("Content-Range", "bytes */0");
          throw new HttpException(
            { error: "Invalid byte range" },
            HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
          );
        }

        const { stream, size, totalSize, start: actualStart, end: actualEnd } =
          await this.storage.openReadStreamRange(
            storageKey,
            start,
            requestedEnd,
          );

        reply
          .code(206)
          .header("Content-Length", String(size))
          .header("Content-Range", `bytes ${actualStart}-${actualEnd}/${totalSize}`);

        return new StreamableFile(stream, { type: contentType });
      }

      const { stream, size } = await this.storage.openReadStream(storageKey);
      if (size !== undefined) {
        reply.header("Content-Length", String(size));
      }

      return new StreamableFile(stream, { type: contentType });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Storage read failed for ${storageKey}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException("Storage is unavailable");
    }
  }
}