import { BadGatewayException, HttpException, NotFoundException } from "@nestjs/common";
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

  it("preserves an explicit storage HTTP exception", async () => {
    prisma.category.findFirst.mockResolvedValue({
      imageUrl: "/api/assets/categories/category-1/image.webp",
    });
    storage.createReadStream.mockRejectedValue(
      new HttpException("Storage unavailable", 503),
    );

    await expect(
      controller.getCategoryAsset({ splat: "category-1/image.webp" }),
    ).rejects.toMatchObject({ status: 503 });
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
