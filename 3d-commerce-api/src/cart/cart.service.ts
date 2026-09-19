import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: this.includeCart(),
    });
  }

  async addItem(userId: string, productId: string, quantity: number, variantId?: string) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new BadRequestException('Quantity must be an integer between 1 and 99');
    }
    let variant: { id: string; name: string; size: string | null; isActive: boolean } | null = null;
    if (variantId) {
      variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId, isActive: true }, select: { id: true, name: true, size: true, isActive: true } });
      if (!variant) throw new NotFoundException('Product variant is not available');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }

    if (product.inventory?.trackStock && !product.inventory.allowBackorder) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId_variantId: { cartId: (await this.getOrCreate(userId)).id, productId, variantId: variantId ?? null } },
      });
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > (product.inventory.stock ?? 0)) {
        throw new BadRequestException('Requested quantity exceeds available stock');
      }
    }

    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId ?? null } },
      create: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getOrCreate(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number, variantId?: string) {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      throw new BadRequestException('Quantity must be an integer between 0 and 99');
    }
    const cart = await this.getOrCreate(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId ?? null } },
      include: { product: { include: { inventory: true } }, variant: true },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (
      item.product.inventory?.trackStock &&
      !item.product.inventory.allowBackorder &&
      quantity > item.product.inventory.stock
    ) {
      throw new Error('Requested quantity exceeds available stock');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    return this.getOrCreate(userId);
  }

  async removeItem(userId: string, productId: string, variantId?: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId, variantId: variantId ?? null },
    });
    return this.getOrCreate(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreate(userId);
  }

  private includeCart() {
    return {
      items: {
        include: {
          product: {
            include: {
              category: true,
              inventory: true,
              prices: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' as const },
              },
              media: {
                orderBy: { sortOrder: 'asc' as const },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    } as const;
  }
}
