import { BadGatewayException, NotFoundException, StreamableFile } from "@nestjs/common";
import { Readable } from "node:stream";
import { AssetController } from "./asset.controller";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage.service";

describe("AssetController storage error handling", () => {
  const prisma = {
    category: { findFirst: jest.fn() },
    customBuildCategory: { findFirst: jest.fn() },
    customBuildOption: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
  };
  const storage = {
    createReadStream: jest.fn(),
    getContentTypeForStorageKey: jest.fn(() => "image/webp"),
    openReadStream: jest.fn(),
    openReadStreamRange: jest.fn(),
  };

  let controller: AssetController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AssetController(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
  });

  it("reports category storage outages as 502 instead of hiding them as 404", async () => {
    prisma.category.findFirst.mockResolvedValue({
      imageUrl: "/api/assets/categories/category-1/image.webp",
    });
    storage.createReadStream.mockRejectedValue(new Error("remote storage unavailable"));

    await expect(
      controller.getCategoryAsset({ splat: "category-1/image.webp" }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("reports custom-build storage outages as 502 instead of hiding them as 404", async () => {
    prisma.customBuildCategory.findFirst.mockResolvedValue({
      imageUrl: "/api/assets/custom-build-categories/category-1/image.webp",
    });
    storage.createReadStream.mockRejectedValue(new Error("remote storage unavailable"));

    await expect(
      controller.getCustomBuildCategoryAsset({
        splat: "category-1/image.webp",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("normalizes upstream storage server errors to 502", async () => {
    prisma.category.findFirst.mockResolvedValue({
      imageUrl: "/api/assets/categories/category-1/image.webp",
    });
    storage.createReadStream.mockRejectedValue(
      new BadGatewayException("Storage unavailable"),
    );

    await expect(
      controller.getCategoryAsset({ splat: "category-1/image.webp" }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("does not expose storage objects that are not published product media", async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      media: [{ url: "/api/assets/products/product-1/public.webp" }],
    });
    const reply = {
      request: { headers: {} },
      header: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await expect(
      controller.getProductAsset(
        { splat: "product-1/internal/source.obj" },
        reply as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(storage.openReadStream).not.toHaveBeenCalled();
  });

  it("serves an asset when the active product explicitly publishes its media URL", async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      media: [{ url: "https://api.voxel3d.org/api/assets/products/product-1/model.glb" }],
    });
    storage.openReadStream.mockResolvedValue({
      stream: Readable.from(Buffer.from("glb")),
      size: 3,
    });
    const reply = {
      request: { headers: {} },
      header: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    const result = await controller.getProductAsset(
      { splat: "product-1/model.glb" },
      reply as never,
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(storage.openReadStream).toHaveBeenCalledWith("products/product-1/model.glb");
  });

  it("treats malformed percent-encoding as an invalid asset path", async () => {
    await expect(
      controller.getProductAsset(
        { splat: "%E0%A4%A" },
        { request: { headers: {} }, header: jest.fn(), code: jest.fn(), send: jest.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });
});
