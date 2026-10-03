import {
  Controller,
  Get,
  NotFoundException,
  Param,
  StreamableFile,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage.service";

@Controller("assets")
export class AssetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get("products/*splat")
  async getProductAsset(
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
      const buffer = await this.storage.read(storageKey);
      return new StreamableFile(buffer, {
        type:
          mimeType ??
          this.storage.getContentTypeForStorageKey(storageKey),
        length: buffer.length,
      });
    } catch {
      throw new NotFoundException("Asset not found");
    }
  }
}