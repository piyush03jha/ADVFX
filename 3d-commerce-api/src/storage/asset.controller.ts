import {
  BadGatewayException,
  Controller,
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

@Controller("assets")
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
      where: { id: productId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Asset not found");

    let mimeType: string | undefined;
    try {
      const [productFile, productMedia, bundleAsset] = await Promise.all([
        this.prisma.productFile.findFirst({
          where: { productId, storageKey },
          select: { mimeType: true },
        }),
        this.prisma.productMedia.findFirst({
          where: { productId, url: assetUrl },
          select: { id: true },
        }),
        this.prisma.productFileBundleAsset.findFirst({
          where: { storageKey, bundle: { is: { productId } } },
          select: { mimeType: true },
        }),
      ]);

      mimeType =
        productFile?.mimeType ??
        bundleAsset?.mimeType ??
        undefined;

      // Database metadata is useful for MIME information, but it must not be
      // the gate for delivery. Existing objects can outlive or temporarily
      // differ from metadata while an upload/delete transaction is repaired.
      void productMedia;
    } catch {
      // Storage remains the source of truth for whether the object exists.
    }

    try {
      const { stream, size } = await this.storage.openReadStream(storageKey);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      if (size !== undefined) {
        reply.header("Content-Length", String(size));
      }
      return new StreamableFile(stream, {
        type: mimeType ?? this.storage.getContentTypeForStorageKey(storageKey),
      });
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