import { Injectable, NotFoundException } from '@nestjs/common';
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

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }

    if (product.inventory?.trackStock && !product.inventory.allowBackorder) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: (await this.getOrCreate(userId)).id, productId } },
      });
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > (product.inventory.stock ?? 0)) {
        throw new Error('Requested quantity exceeds available stock');
      }
    }

    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getOrCreate(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getOrCreate(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
      include: { product: { include: { inventory: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (
      item.product.inventory?.trackStock &&
      !item.product.inventory.allowBackorder &&
      quantity > item.product.inventory.stock
    ) {
      throw new Error('Requested quantity exceeds available stock');
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getOrCreate(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
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
