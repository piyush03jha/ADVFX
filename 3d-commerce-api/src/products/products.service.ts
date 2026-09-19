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

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: this.publicProductInclude(),
      orderBy: [
        { isFeatured: 'desc' },
        { isBestseller: 'desc' },
        { isTrending: 'desc' },
        { createdAt: 'desc' },
      ],
    });
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
      take: 10,
    });

    return products
      .map((product) => this.toHeroProduct(product))
      .filter((product) => product.model);
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
      metrics: true,
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
      metrics: {
        views: product.metrics?.viewCount ?? 0,
        cartAdds: product.metrics?.cartAddCount ?? 0,
        purchases: product.metrics?.purchaseCount ?? 0,
        unitsSold: product.metrics?.unitsSold ?? 0,
      },
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
      metrics: true,
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
