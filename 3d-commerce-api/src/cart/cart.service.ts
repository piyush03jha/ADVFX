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
    const variant = variantId
      ? await this.prisma.productVariant.findFirst({
          where: { id: variantId, productId, isActive: true },
          include: { inventory: true },
        })
      : null;

    if (variantId && !variant) throw new NotFoundException('Product variant is not available');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }

    const inventory = variant?.inventory ?? product.inventory;
    if (inventory?.trackStock && !inventory.allowBackorder) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId_variantKey: { cartId: (await this.getOrCreate(userId)).id, productId, variantKey: variantId ?? '__base__' } },
      });
      const available = Math.max(0, inventory.stock - inventory.reserved);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > available) {
        throw new BadRequestException('Requested quantity exceeds available stock');
      }
    }

    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId_variantKey: { cartId: cart.id, productId, variantKey: variantId ?? '__base__' } },
      create: { cartId: cart.id, productId, variantId: variantId ?? null, variantKey: variantId ?? '__base__', quantity },
      update: { quantity: { increment: quantity } },
    });

    await this.prisma.productMetrics.upsert({
      where: { productId },
      create: { productId, cartAddCount: 1 },
      update: { cartAddCount: { increment: 1 } },
    });

    return this.getOrCreate(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number, variantId?: string) {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      throw new BadRequestException('Quantity must be an integer between 0 and 99');
    }
    const cart = await this.getOrCreate(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_productId_variantKey: { cartId: cart.id, productId, variantKey: variantId ?? '__base__' } },
      include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    const inventory = item.variant?.inventory ?? item.product.inventory;
    if (
      inventory?.trackStock &&
      !inventory.allowBackorder &&
      quantity > Math.max(0, inventory.stock - inventory.reserved)
    ) {
      throw new BadRequestException('Requested quantity exceeds available stock');
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
      where: {
        cartId: cart.id,
        productId,
        variantKey: variantId ?? '__base__',
      },
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
          variant: {
            include: { price: true },
          },
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
