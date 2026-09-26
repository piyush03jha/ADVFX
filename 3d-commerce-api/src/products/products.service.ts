import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { StorageService } from '../storage/storage.service';
import sharp from 'sharp';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.ensureSlugAvailable(dto.slug);

    const { stock, lowStockAt, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        inventory: {
          create: {
            stock: stock ?? 0,
            lowStockAt: lowStockAt ?? 5,
          },
        },
      },
      include: this.productInclude(),
    });
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        ...this.publicProductInclude(),
        metrics: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { isTrending: 'desc' }, { createdAt: 'desc' }],
    });

    const bestsellerScores = products
      .map((product) => ({
        id: product.id,
        score:
          (product.metrics?.unitsSold ?? 0) * 8 +
          (product.metrics?.purchaseCount ?? 0) * 4 +
          (product.metrics?.cartAddCount ?? 0) +
          (product.metrics?.viewCount ?? 0) * 0.1,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const bestsellerIds = new Set(bestsellerScores.map((item) => item.id));

    return products.map((product) => ({
      ...product,
      isBestseller: bestsellerIds.has(product.id),
    }));
  }

  /**
   * Returns the products explicitly marked as featured for the home hero.
   *
   * The hero is a presentation of catalog products, so it reuses the
   * existing Product/ProductMedia data instead of introducing a duplicate
   * hero table.
   */
  async findHeroProducts() {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      include: this.heroProductInclude(),
      orderBy: { createdAt: 'desc' },
      take: await this.heroLimit(),
    });

    return products
      .map((product) => this.toHeroProduct(product))
      .filter((product) => product.model);
  }

  private async heroLimit() {
    const setting = await this.prisma.siteSetting.findUnique({ where: { key: 'hero' } });
    if (!setting) return 10;
    try {
      const value = JSON.parse(setting.value) as { maxItems?: number };
      const limit = Number(value.maxItems);
      return Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 12) : 10;
    } catch {
      return 10;
    }
  }

  async recordView(id: string) {
    await this.ensureActiveProduct(id);
    return this.prisma.productMetrics.upsert({
      where: { productId: id },
      create: { productId: id, viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
  }

  async getMetrics(id: string) {
    await this.ensureActiveProduct(id);
    const metrics = await this.prisma.productMetrics.findUnique({
      where: { productId: id },
    });

    return metrics ?? {
      productId: id,
      viewCount: 0,
      cartAddCount: 0,
      purchaseCount: 0,
      unitsSold: 0,
    };
  }

  async getLatestReviews(limit = 6) {
    const reviews = await this.prisma.productReview.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 12),
    });

    return reviews;
  }

  async getReviews(id: string) {
    await this.ensureActiveProduct(id);

    const [reviews, aggregate] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        where: { productId: id, isPublished: true },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          verifiedPurchase: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productReview.aggregate({
        where: { productId: id, isPublished: true },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      reviews,
      summary: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count._all,
      },
    };
  }

  async createReview(userId: string, productId: string, dto: CreateProductReviewDto) {
    await this.ensureActiveProduct(productId);

    const purchased = await this.prisma.order.findFirst({
      where: {
        userId,
        payment: { status: 'CAPTURED' },
        items: { some: { productId } },
      },
      select: { id: true },
    });

    if (!purchased) {
      throw new ForbiddenException('Only customers who purchased this product can review it');
    }

    const existing = await this.prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    return this.prisma.productReview.create({
      data: {
        productId,
        userId,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
        verifiedPurchase: true,
        isPublished: true,
      },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      include: this.publicProductInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: this.publicProductInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureProductExists(id);

    if (dto.slug) await this.ensureSlugAvailable(dto.slug, id);

    const { stock, lowStockAt, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData });

      if (stock !== undefined || lowStockAt !== undefined) {
        await tx.productInventory.upsert({
          where: { productId: id },
          create: {
            productId: id,
            stock: stock ?? 0,
            lowStockAt: lowStockAt ?? 5,
          },
          update: {
            ...(stock !== undefined ? { stock } : {}),
            ...(lowStockAt !== undefined ? { lowStockAt } : {}),
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: this.productInclude(),
      });
    });
  }

  async remove(id: string) {
    await this.ensureProductExists(id);
    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return { message: 'Product archived successfully' };
  }

  async setPrice(id: string, dto: UpsertPriceDto) {
    await this.ensureProductExists(id);

    const amountMinor = dto.amountMinor;
    const compareAtMinor = dto.compareAtMinor;

    if (compareAtMinor !== undefined && compareAtMinor < amountMinor) {
      throw new ConflictException('compareAtMinor cannot be lower than amountMinor');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productPrice.updateMany({
        where: { productId: id, isActive: true },
        data: { isActive: false },
      });

      return tx.productPrice.create({
        data: {
          productId: id,
          currency: dto.currency ?? 'INR',
          amountMinor,
          compareAtMinor,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          isActive: true,
        },
      });
    });
  }

  async updateInventory(id: string, dto: UpdateInventoryDto) {
    await this.ensureProductExists(id);

    return this.prisma.productInventory.upsert({
      where: { productId: id },
      create: {
        productId: id,
        stock: dto.stock ?? 0,
        lowStockAt: dto.lowStockAt ?? 5,
        trackStock: dto.trackStock ?? true,
        allowBackorder: dto.allowBackorder ?? false,
      },
      update: {
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.lowStockAt !== undefined ? { lowStockAt: dto.lowStockAt } : {}),
        ...(dto.trackStock !== undefined ? { trackStock: dto.trackStock } : {}),
        ...(dto.allowBackorder !== undefined ? { allowBackorder: dto.allowBackorder } : {}),
      },
    });
  }

  async uploadImage(id: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    await this.ensureProductExists(id);

    const maxBytes = Math.min(Number(process.env.MAX_PRODUCT_IMAGE_MB ?? 10), 25) * 1024 * 1024;
    if (!file.buffer?.length) throw new ConflictException('Uploaded image is empty');
    if (file.buffer.length > maxBytes) {
      throw new ConflictException(`Image exceeds the maximum size of ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }

    const extension = file.originalname.toLowerCase().split('.').pop() ?? '';
    const allowed = new Set(['jpg', 'jpeg', 'png', 'webp']);
    if (!allowed.has(extension)) throw new ConflictException('Only JPG, PNG and WebP images are supported');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new ConflictException('Invalid image MIME type');
    }

    try {
      await sharp(file.buffer).metadata();
    } catch {
      throw new ConflictException('Uploaded file is not a valid image');
    }

    const stored = await this.storage.saveProductFile({
      productId: id,
      filename: file.originalname,
      buffer: file.buffer,
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.productMedia.updateMany({
          where: { productId: id, type: 'IMAGE', isPrimary: true },
          data: { isPrimary: false },
        });

        return tx.productMedia.create({
          data: {
            productId: id,
            type: 'IMAGE',
            url: stored.storageUrl,
            altText: file.originalname,
            sortOrder: await tx.productMedia.count({ where: { productId: id, type: 'IMAGE' } }),
            isPrimary: true,
          },
        });
      });
    } catch (error) {
      try { await this.storage.delete(stored.storageKey); } catch { /* preserve database error */ }
      throw error;
    }
  }

  async addMedia(id: string, dto: CreateMediaDto) {
    await this.ensureProductExists(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productMedia.updateMany({
          where: { productId: id, type: dto.type, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.productMedia.create({
        data: {
          productId: id,
          type: dto.type,
          url: dto.url,
          altText: dto.altText,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });
  }

  async removeMedia(id: string, mediaId: string) {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId: id },
      select: { id: true },
    });

    if (!media) throw new NotFoundException(`Product media "${mediaId}" not found`);

    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    return { message: 'Product media removed successfully' };
  }

  private async ensureActiveProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
  }

  private async ensureProductExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
  }

  private async ensureSlugAvailable(slug: string, productId?: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProduct && existingProduct.id !== productId) {
      throw new ConflictException(`A product with slug "${slug}" already exists`);
    }
  }

  private heroProductInclude(): Prisma.ProductInclude {
    return {
      category: true,
      prices: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      media: {
        where: {
          type: 'MODEL_PREVIEW',
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    };
  }

  private toHeroProduct(
    product: Prisma.ProductGetPayload<{
      include: ReturnType<ProductsService['heroProductInclude']>;
    }>,
  ) {
    const activePrice =
      product.prices.find(
        (price) => price.currency === 'INR',
      ) ?? product.prices[0];

    const model =
      product.media.find(
        (media) => media.isPrimary,
      )?.url ??
      product.media[0]?.url ??
      null;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description ?? '',
      price: activePrice ? activePrice.amountMinor / 100 : 0,
      currency: activePrice?.currency ?? 'INR',
      model,
      category: product.category?.name ?? '',
    };
  }

  private publicProductInclude(): Prisma.ProductInclude {
    return {
      category: true,
      prices: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      tags: { include: { tag: true } },
      variants: {
        where: { isActive: true },
        include: { price: true },
        orderBy: { createdAt: "asc" },
      },
    };
  }

  private productInclude(): Prisma.ProductInclude {
    return {
      category: true,
      inventory: true,
      prices: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      tags: { include: { tag: true } },
      files: true,
    };
  }
}
