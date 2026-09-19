import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const PRODUCT_INCLUDE = {
  category: true,
  prices: {
    where: { isActive: true },
    orderBy: { createdAt: 'desc' as const },
  },
  media: {
    orderBy: { sortOrder: 'asc' as const },
  },
  tags: {
    include: { tag: true },
  },
  variants: {
    where: { isActive: true },
    include: { price: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: { product: { include: PRODUCT_INCLUDE } },
        },
      },
    });

    if (!wishlist) {
      return { id: null, items: [] };
    }

    return {
      id: wishlist.id,
      items: wishlist.items.map((item) => ({
        id: item.id,
        product: item.product,
        createdAt: item.createdAt,
      })),
    };
  }

  async addItem(userId: string, productId: string) {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) {
      throw new BadRequestException('Product ID is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: normalizedProductId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }

    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    await this.prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: normalizedProductId,
        },
      },
      create: {
        wishlistId: wishlist.id,
        productId: normalizedProductId,
      },
      update: {},
    });

    return this.getWishlist(userId);
  }

  async removeItem(userId: string, productId: string) {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) {
      throw new BadRequestException('Product ID is required');
    }

    await this.prisma.wishlistItem.deleteMany({
      where: {
        productId: normalizedProductId,
        wishlist: { userId },
      },
    });

    return this.getWishlist(userId);
  }

  async clear(userId: string) {
    await this.prisma.wishlistItem.deleteMany({
      where: { wishlist: { userId } },
    });

    return this.getWishlist(userId);
  }
}
