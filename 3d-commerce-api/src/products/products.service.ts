import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
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

export interface ShopListQuery {
  page: number;
  limit: number;
  q?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'featured' | 'newest' | 'popular' | 'rating' | 'price-low' | 'price-high';
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.ensureSlugAvailable(dto.slug);

    const { stock, lowStockAt, ...productData } = dto;
    const baseAmount = 0;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          inventory: {
            create: {
              stock: stock ?? 0,
              lowStockAt: lowStockAt ?? 5,
            },
          },
        },
      });

      // Every physical product starts with the standard three size options.
      // Admin can change these names, dimensions and prices from the catalog.
      for (const item of [
        { name: 'Small', size: '15 cm' },
        { name: 'Medium', size: '20 cm' },
        { name: 'Large', size: '25 cm' },
      ]) {
        await tx.productVariant.create({
          data: {
            productId: product.id,
            name: item.name,
            size: item.size,
            price: {
              create: {
                currency: 'INR',
                amountMinor: baseAmount,
                isActive: true,
              },
            },
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: this.productInclude(),
      });
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: {
      name?: string;
      size?: string | null;
      sku?: string | null;
      price?: number;
      compareAtPrice?: number | null;
      isActive?: boolean;
      stock?: number;
      lowStockAt?: number;
      trackStock?: boolean;
      allowBackorder?: boolean;
    },
  ) {
    await this.ensureProductExists(productId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { price: true },
    });

    if (!variant) throw new NotFoundException('Product variant not found');

    const name = input.name?.trim();
    const size = input.size?.trim() || null;
    const sku = input.sku?.trim() || null;

    if (name === '') throw new BadRequestException('Variant name is required');
    if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
      throw new BadRequestException('Variant price must be a valid non-negative number');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(input.size !== undefined ? { size } : {}),
          ...(input.sku !== undefined ? { sku } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.stock !== undefined ? { stock: input.stock } : {}),
          ...(input.lowStockAt !== undefined ? { lowStockAt: input.lowStockAt } : {}),
          ...(input.trackStock !== undefined ? { trackStock: input.trackStock } : {}),
          ...(input.allowBackorder !== undefined ? { allowBackorder: input.allowBackorder } : {}),
        },
      });

      if (
        input.price !== undefined ||
        input.compareAtPrice !== undefined
      ) {
        const amountMinor = Math.round((input.price ?? ((variant.price?.amountMinor ?? 0) / 100)) * 100);
        const compareAtMinor =
          input.compareAtPrice === null
            ? null
            : input.compareAtPrice !== undefined
              ? Math.round(input.compareAtPrice * 100)
              : variant.price?.compareAtMinor ?? null;

        if (compareAtMinor !== null && compareAtMinor < amountMinor) {
          throw new ConflictException('Compare-at price cannot be lower than variant price');
        }

        await tx.productVariantPrice.upsert({
          where: { variantId },
          create: {
            variantId,
            currency: 'INR',
            amountMinor,
            compareAtMinor,
            isActive: true,
          },
          update: {
            amountMinor,
            compareAtMinor,
            currency: 'INR',
            isActive: true,
          },
        });
      }

      return tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        include: { price: true },
      });
    });
  }

  async createVariant(
    productId: string,
    input: {
      name: string;
      size?: string | null;
      sku?: string | null;
      price?: number;
      compareAtPrice?: number | null;
      stock?: number;
      lowStockAt?: number;
      trackStock?: boolean;
      allowBackorder?: boolean;
    },
  ) {
    await this.ensureProductExists(productId);

    const name = input.name.trim();
    if (!name) throw new BadRequestException('Variant name is required');
    if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
      throw new BadRequestException('Variant price must be a valid non-negative number');
    }

    const amountMinor = Math.round((input.price ?? 0) * 100);
    const compareAtMinor =
      input.compareAtPrice == null ? null : Math.round(input.compareAtPrice * 100);

    if (compareAtMinor !== null && compareAtMinor < amountMinor) {
      throw new ConflictException('Compare-at price cannot be lower than variant price');
    }

    return this.prisma.productVariant.create({
      data: {
        productId,
        name,
        size: input.size?.trim() || null,
        sku: input.sku?.trim() || null,
        stock: input.stock ?? 0,
        reserved: 0,
        lowStockAt: input.lowStockAt ?? 5,
        trackStock: input.trackStock ?? true,
        allowBackorder: input.allowBackorder ?? false,
        price: {
          create: {
            currency: 'INR',
            amountMinor,
            compareAtMinor,
            isActive: true,
          },
        },
      },
      include: { price: true },
    });
  }

  async removeVariant(productId: string, variantId: string) {
    await this.ensureProductExists(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Product variant not found');

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });

    return { message: 'Product variant deactivated successfully' };
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
   * Paginated, filterable storefront listing.
   *
   * Unlike findAll(), this returns one page of lightweight rows (primary image,
   * active price, first variant, inventory, metrics) so payload size and query
   * cost stay constant as the catalog grows.
   */
  async findShopPage(query: ShopListQuery) {
    const pageSize = Math.min(Math.max(Math.trunc(query.limit) || 12, 1), 48);
    const requestedPage = Math.max(Math.trunc(query.page) || 1, 1);
    const sort = query.sort ?? 'featured';

    const and: Prisma.ProductWhereInput[] = [];

    if (query.categories?.length) {
      and.push({
        category: {
          OR: query.categories.flatMap((value) => [
            { name: { equals: value, mode: 'insensitive' as const } },
            { slug: { equals: value, mode: 'insensitive' as const } },
          ]),
        },
      });
    }

    const search = query.q?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const hasMin = query.minPrice !== undefined && query.minPrice > 0;
    const hasMax = query.maxPrice !== undefined && Number.isFinite(query.maxPrice);
    if (hasMin || hasMax) {
      and.push({
        prices: {
          some: {
            isActive: true,
            amountMinor: {
              ...(hasMin ? { gte: Math.round(query.minPrice! * 100) } : {}),
              ...(hasMax ? { lte: Math.round(query.maxPrice! * 100) } : {}),
            },
          },
        },
      });
    }

    const where: Prisma.ProductWhereInput = { status: 'ACTIVE', AND: and };
    const minRating = query.minRating && query.minRating > 0 ? query.minRating : 0;

    // Price and rating live in other tables (one-to-many), so Prisma cannot
    // order or filter on them directly. For those cases we sort a light
    // id-only projection in memory, then load full rows for just one page.
    const needsInMemory = sort === 'price-low' || sort === 'price-high' || sort === 'rating' || minRating > 0;

    let total: number;
    let page = requestedPage;
    let pageIds: string[];
    let ratingMap: Map<string, { rating: number; reviewCount: number }>;

    if (needsInMemory) {
      const [candidates, ratings] = await Promise.all([
        this.prisma.product.findMany({
          where,
          select: {
            id: true,
            createdAt: true,
            prices: { where: { isActive: true }, select: { amountMinor: true, currency: true } },
          },
        }),
        this.reviewAggregates(),
      ]);
      ratingMap = ratings;

      const rows = candidates
        .map((row) => ({
          id: row.id,
          createdAt: row.createdAt.getTime(),
          price: (row.prices.find((p) => p.currency === 'INR') ?? row.prices[0])?.amountMinor ?? 0,
          rating: ratings.get(row.id)?.rating ?? 0,
          reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
        }))
        .filter((row) => row.rating >= minRating);

      rows.sort((a, b) => {
        switch (sort) {
          case 'price-low':
            return a.price - b.price || b.createdAt - a.createdAt;
          case 'price-high':
            return b.price - a.price || b.createdAt - a.createdAt;
          case 'rating':
            return b.rating - a.rating || b.reviewCount - a.reviewCount || b.createdAt - a.createdAt;
          default:
            return b.createdAt - a.createdAt;
        }
      });

      total = rows.length;
      page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
      pageIds = rows.slice((page - 1) * pageSize, page * pageSize).map((row) => row.id);
    } else {
      total = await this.prisma.product.count({ where });
      page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
      const ids = await this.prisma.product.findMany({
        where,
        select: { id: true },
        orderBy: this.shopOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      pageIds = ids.map((row) => row.id);
      ratingMap = await this.reviewAggregates(pageIds);
    }

    const products = pageIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: pageIds } },
          include: {
            category: true,
            prices: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
            media: {
              where: { type: 'IMAGE' },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
            variants: {
              where: { isActive: true },
              include: { price: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
            inventory: true,
            metrics: true,
          },
        })
      : [];

    const byId = new Map(products.map((product) => [product.id, product]));
    const items = pageIds
      .map((id) => byId.get(id))
      .filter((product): product is NonNullable<typeof product> => Boolean(product))
      .map((product) => ({
        ...product,
        tags: [],
        isBestseller: false,
        rating: ratingMap.get(product.id)?.rating ?? 0,
        reviewCount: ratingMap.get(product.id)?.reviewCount ?? 0,
      }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  private shopOrderBy(sort: ShopListQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'newest':
        return [{ createdAt: 'desc' }, { id: 'asc' }];
      case 'popular':
        return [
          { metrics: { unitsSold: 'desc' } },
          { metrics: { cartAddCount: 'desc' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ];
      case 'featured':
      default:
        return [{ isFeatured: 'desc' }, { isTrending: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  private async reviewAggregates(productIds?: string[]) {
    const groups = await this.prisma.productReview.groupBy({
      by: ['productId'],
      where: { isPublished: true, ...(productIds ? { productId: { in: productIds } } : {}) },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return new Map(
      groups.map((group) => [
        group.productId,
        {
          rating: Math.round((group._avg.rating ?? 0) * 10) / 10,
          reviewCount: group._count._all,
        },
      ]),
    );
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
        photoUrl: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
        product: { select: { id: true, name: true, slug: true, media: { where: { type: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, altText: true } } } },
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
          photoUrl: true,
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

  async getReviewEligibility(userId: string, productId: string) {
    await this.ensureActiveProduct(productId);

    const [purchased, review] = await this.prisma.$transaction([
      this.prisma.order.findFirst({
        where: {
          userId,
          payment: { status: 'CAPTURED' },
          items: { some: { productId } },
        },
        select: { id: true },
      }),
      this.prisma.productReview.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { id: true },
      }),
    ]);

    return {
      purchased: Boolean(purchased),
      alreadyReviewed: Boolean(review),
      canReview: Boolean(purchased) && !review,
    };
  }

  async uploadReviewPhoto(
    userId: string,
    productId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
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
      throw new ForbiddenException('Only customers who purchased this product can upload a review photo');
    }

    if (!file.buffer?.length) throw new BadRequestException('Review image is empty');
    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Review image must be 5 MB or smaller');
    }

    const extension = file.originalname.toLowerCase().split('.').pop() ?? '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      throw new BadRequestException('Only JPG, PNG and WebP review images are supported');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid review image MIME type');
    }

    try {
      await sharp(file.buffer).metadata();
    } catch {
      throw new BadRequestException('Uploaded review image is not valid');
    }

    const stored = await this.storage.saveReviewImage(
      productId + '/' + userId,
      file.originalname,
      file.buffer,
    );

    return { url: stored.storageUrl };
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
        photoUrl: dto.photoUrl?.trim() || null,
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

  async findAllAdminReviews() {
    return this.prisma.productReview.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setReviewPublished(id: string, isPublished: boolean) {
    const review = await this.prisma.productReview.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.productReview.update({
      where: { id },
      data: { isPublished },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      include: this.publicProductInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
    return this.ensurePublicModelMedia(product);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: this.publicProductInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return this.ensurePublicModelMedia(product);
  }

  private ensurePublicModelMedia(product: any) {
    const hasModelMedia = product.media?.some(
      (media: { type: string; url: string }) =>
        media.type === 'MODEL_PREVIEW' && media.url?.trim(),
    );

    if (hasModelMedia) return product;

    const modelFile = product.files?.find(
      (file: { storageUrl: string | null; processingStatus: string }) =>
        file.storageUrl?.trim() && file.processingStatus === 'COMPLETED',
    );

    if (!modelFile?.storageUrl) return product;

    return {
      ...product,
      media: [
        ...(product.media ?? []),
        {
          id: `model-file-${modelFile.id}`,
          productId: product.id,
          type: 'MODEL_PREVIEW',
          url: modelFile.storageUrl,
          altText: modelFile.originalName || 'GLB model',
          sortOrder: 0,
          isPrimary: true,
        },
      ],
    };
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
    if (!file.buffer?.length) throw new BadRequestException('Uploaded image is empty');
    if (file.buffer.length > maxBytes) {
      throw new BadRequestException(`Image exceeds the maximum size of ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }

    const extension = file.originalname.toLowerCase().split('.').pop() ?? '';
    const allowed = new Set(['jpg', 'jpeg', 'png', 'webp']);
    if (!allowed.has(extension)) throw new BadRequestException('Only JPG, PNG and WebP images are supported');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid image MIME type');
    }

    try {
      await sharp(file.buffer).metadata();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid image');
    }

    // Never keep the original product image. Normalize raster uploads to
    // web-ready WebP and cap the longest edge for fast storefront delivery.
    let optimizedImage: Buffer;
    try {
      optimizedImage = await sharp(file.buffer)
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 84, effort: 5 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Unable to optimize the uploaded image');
    }

    const baseName = file.originalname.replace(/\.[^/.]+$/, '') || 'product-image';
    const stored = await this.storage.saveProductFile({
      productId: id,
      filename: `${baseName}.webp`,
      buffer: optimizedImage,
    });

    // Product assets use content-addressed storage keys. If the exact same
    // image is uploaded again for this product, reuse the existing media row
    // instead of creating another database record for the same object.
    if (!stored.storageUrl) {
      try { await this.storage.delete(stored.storageKey); } catch { /* preserve configuration error */ }
      throw new InternalServerErrorException(
        'Product image storage requires STORAGE_PUBLIC_BASE_URL or a public asset delivery route',
      );
    }

    const storageUrl = stored.storageUrl;
    // Narrowed above: ProductMedia.url is intentionally non-null because
    // storefront product media must have a browser-accessible URL.

    const existingMedia = await this.prisma.productMedia.findFirst({
      where: { productId: id, type: 'IMAGE', url: storageUrl },
    });
    if (existingMedia) {
      return existingMedia;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const imageCount = await tx.productMedia.count({
          where: { productId: id, type: 'IMAGE' },
        });
        const isFirstImage = imageCount === 0;

        return tx.productMedia.create({
          data: {
            productId: id,
            type: 'IMAGE',
            url: storageUrl,
            altText: file.originalname,
            sortOrder: imageCount,
            isPrimary: isFirstImage,
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

  getMediaAbsolutePath(storageKey: string) {
    return this.storage.getAbsolutePath(storageKey);
  }

  async getMediaFile(id: string, mediaId: string) {
    await this.ensureProductExists(id);
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId: id },
      select: { id: true, url: true },
    });
    if (!media) throw new NotFoundException(`Product media "${mediaId}" not found`);
    return media;
  }

  async removeMedia(id: string, mediaId: string) {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId: id },
      select: { id: true, url: true },
    });

    if (!media) throw new NotFoundException(`Product media "${mediaId}" not found`);

    const storageKey = this.storageKeyFromMediaUrl(media.url);
    const assetUrl = media.url.startsWith('/api/assets/') && storageKey
      ? this.storage.getPublicAssetUrl(storageKey)
      : null;
    const mediaReferenceUrl = assetUrl ?? media.url;

    await this.prisma.productMedia.delete({ where: { id: mediaId } });

    // Remove the object only when no other database record still references it.
    // This is important for deduplicated assets shared by multiple media rows.
    if (storageKey) {
      const [otherMedia, productFile, bundleAsset] = await Promise.all([
        this.prisma.productMedia.count({
          where: {
            productId: id,
            url: mediaReferenceUrl,
          },
        }),
        this.prisma.productFile.count({
          where: { productId: id, storageKey },
        }),
        this.prisma.productFileBundleAsset.count({
          where: {
            storageKey,
            bundle: { is: { productId: id } },
          },
        }),
      ]);

      if (otherMedia === 0 && productFile === 0 && bundleAsset === 0) {
        try {
          await this.storage.delete(storageKey);
        } catch {
          // Preserve successful database deletion; storage cleanup can be retried.
        }
      }
    }

    return { message: 'Product media removed successfully' };
  }

  private storageKeyFromMediaUrl(url: string): string | null {
    if (url.startsWith('/api/assets/')) {
      try {
        return url
          .slice('/api/assets/'.length)
          .split('/')
          .map((segment) => decodeURIComponent(segment))
          .join('/');
      } catch {
        return null;
      }
    }

    if (url.startsWith('/storage/')) {
      return url.slice('/storage/'.length);
    }

    return null;
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

    const models = product.media.filter((media) => media.url.trim());

    const model =
      models.find((media) => media.isPrimary)?.url ??
      models[0]?.url ??
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
      files: {
        where: {
          fileType: 'MODEL',
          format: 'GLB',
          processingStatus: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
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
      variants: {
        include: { price: true },
        orderBy: { createdAt: 'asc' },
      },
    };
  }
}
