import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryReservationStatus, OrderStatus, Prisma, NotificationType } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const RESERVATION_MINUTES = 30;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly pricing: PricingService,
  ) {}

  async createFromCart(
    userId: string,
    shippingAddressId: string,
    couponCode?: string,
    idempotencyKey?: string,
    quotedSnapshot?: {
      subtotalMinor?: number;
      shippingMinor?: number;
      discountMinor?: number;
      taxMinor?: number;
      totalMinor?: number;
      currency?: string;
    },
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.order.findFirst({
        where: { userId, idempotencyKey },
        include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, promotion: true, shippingRule: true },
      });
      if (existing) return existing;
    }

    const quote = await this.pricing.calculate(userId, { shippingAddressId, couponCode });

    if (quotedSnapshot) {
      const expected = [
        ["subtotal", quotedSnapshot.subtotalMinor, quote.summary.subtotalMinor],
        ["shipping", quotedSnapshot.shippingMinor, quote.summary.shippingMinor],
        ["discount", quotedSnapshot.discountMinor, quote.summary.discountMinor],
        ["tax", quotedSnapshot.taxMinor, quote.summary.taxMinor],
        ["total", quotedSnapshot.totalMinor, quote.summary.totalMinor],
      ] as const;

      if (
        (quotedSnapshot.currency && quotedSnapshot.currency !== quote.currency) ||
        expected.some(
          ([, clientValue, serverValue]) =>
            clientValue !== undefined && clientValue !== serverValue,
        )
      ) {
        throw new BadRequestException(
          "The checkout total changed. Please refresh the quote and try again.",
        );
      }
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);

    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: { include: { price: true } },
              product: { include: { inventory: true, prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } } },
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

      const address = await tx.address.findFirst({ where: { id: shippingAddressId, userId } });
      if (!address) throw new NotFoundException('Shipping address not found');
      if (quote.summary.totalMinor < 0) {
        throw new BadRequestException('Invalid checkout total');
      }

      const quotedCart = new Map(
        quote.items.map((item) => [
          item.productId + ':' + (item.variantId ?? '__base__'),
          item.quantity,
        ]),
      );

      const currentCart = new Map(
        cart.items.map((item) => [
          item.productId + ':' + (item.variantId ?? '__base__'),
          item.quantity,
        ]),
      );

      if (
        quotedCart.size !== currentCart.size ||
        Array.from(quotedCart.entries()).some(
          ([key, quantity]) => currentCart.get(key) !== quantity,
        )
      ) {
        throw new BadRequestException(
          'Cart changed while checkout was loading. Please refresh the quote and try again.',
        );
      }

      if (idempotencyKey) {
        const raced = await tx.order.findFirst({
          where: { userId, idempotencyKey },
          include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, promotion: true, shippingRule: true },
        });
        if (raced) return raced;
      }

      if (quote.promotion?.id) {
        const claimedPromotion = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "Promotion"
            SET "usageCount" = "usageCount" + 1,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${quote.promotion.id}
              AND "isActive" = true
              AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")
          `,
        );
        if (Number(claimedPromotion) !== 1) {
          throw new BadRequestException('Coupon usage limit has been reached');
        }
      }

      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = quote.items.map((item) => ({
        product: { connect: { id: item.productId } },
        variant: item.variantId
          ? { connect: { id: item.variantId } }
          : undefined,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalPriceMinor: item.lineTotalMinor,
      }));

      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          idempotencyKey: idempotencyKey ?? null,
          user: { connect: { id: userId } },
          status: 'PENDING_PAYMENT',
          currency: quote.currency,
          subtotalMinor: quote.summary.subtotalMinor,
          discountMinor: quote.summary.discountMinor,
          shippingMinor: quote.summary.shippingMinor,
          taxMinor: quote.summary.taxMinor,
          totalMinor: quote.summary.totalMinor,
          shippingRule: quote.shippingRule ? { connect: { id: quote.shippingRule.id } } : undefined,
          promotion: quote.promotion ? { connect: { id: quote.promotion.id } } : undefined,
          appliedCouponCode: quote.promotion?.code ?? null,
          shippingAddress: { connect: { id: address.id } },
          items: { create: orderItems },
          payment: {
            create: {
              provider: 'RAZORPAY',
              status: 'PENDING',
              amountMinor: quote.summary.totalMinor,
              currency: quote.currency,
            },
          },
          shipment: { create: { status: 'PENDING' } },
        },
        include: { items: true, shippingAddress: true },
      });

      for (const item of cart.items) {
        const inventory = item.product.inventory;
        if (!inventory || !inventory.trackStock || inventory.allowBackorder) continue;
        const updated = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "ProductInventory"
            SET "reserved" = "reserved" + ${item.quantity}
            WHERE "id" = ${inventory.id}
              AND "trackStock" = true
              AND "allowBackorder" = false
              AND ("stock" - "reserved") >= ${item.quantity}
          `,
        );
        if (Number(updated) !== 1) throw new BadRequestException(`Stock changed for "${item.product.name}"; please try again`);
        await tx.inventoryReservation.create({
          data: { productId: item.product.id, productInventoryId: inventory.id, orderId: order.id, quantity: item.quantity, status: 'ACTIVE', expiresAt },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return this.findOneForTransaction(tx, order.id);
    });

    if (result.userId) {
      await this.notifications.create(result.userId, {
        type: NotificationType.ORDER_CREATED,
        title: 'Order created',
        message: `Order ${result.orderNumber} has been created and is awaiting payment.`,
        entityType: 'ORDER',
        entityId: result.id,
      });
    }
    return result;
  }

  async findMine(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, promotion: true, shippingRule: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, promotion: true, shippingRule: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAllAdmin(status?: OrderStatus) {
    return this.prisma.order.findMany({ where: status ? { status } : undefined, include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, user: true, promotion: true, shippingRule: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, user: true, promotion: true, shippingRule: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOneAdmin(id);
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(status)) throw new BadRequestException(`Cannot change order from ${order.status} to ${status}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED') {
        await this.releaseReservations(tx, id, InventoryReservationStatus.RELEASED);
        if (order.status === OrderStatus.PENDING_PAYMENT && order.promotionId) {
          await this.releasePromotionUsage(tx, order.promotionId);
        }
      }
      if (status === 'CONFIRMED' && order.status === 'PENDING_PAYMENT') await this.consumeReservations(tx, id);

      return tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'SHIPPED' ? { shipment: { upsert: { create: { status: 'SHIPPED', shippedAt: new Date() }, update: { status: 'SHIPPED', shippedAt: new Date() } } } } : {}),
          ...(status === 'DELIVERED' ? { shipment: { upsert: { create: { status: 'DELIVERED', deliveredAt: new Date() }, update: { status: 'DELIVERED', deliveredAt: new Date() } } } } : {}),
        },
        include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, user: true, promotion: true, shippingRule: true },
      });
    });

    if (updated.userId) {
      const typeByStatus: Partial<Record<OrderStatus, NotificationType>> = {
        CONFIRMED: NotificationType.ORDER_CONFIRMED,
        PROCESSING: NotificationType.ORDER_PROCESSING,
        SHIPPED: NotificationType.ORDER_SHIPPED,
        DELIVERED: NotificationType.ORDER_DELIVERED,
        CANCELLED: NotificationType.ORDER_CANCELLED,
        REFUNDED: NotificationType.ORDER_REFUNDED,
      };
      const type = typeByStatus[status];
      if (type) await this.notifications.create(updated.userId, { type, title: `Order ${status.toLowerCase()}`, message: `Order ${updated.orderNumber} is now ${status.toLowerCase()}.`, entityType: 'ORDER', entityId: updated.id });
    }
    return updated;
  }

  async expireReservations() {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    for (const reservation of expired) {
      await this.prisma.$transaction(async (tx) => {
        await this.releaseReservations(
          tx,
          reservation.orderId,
          InventoryReservationStatus.EXPIRED,
        );

        const order = await tx.order.findUnique({
          where: { id: reservation.orderId },
          select: { status: true, payment: { select: { status: true } } },
        });

        if (order?.status !== 'PENDING_PAYMENT') return;

        await tx.order.update({
          where: { id: reservation.orderId },
          data: { status: 'CANCELLED' },
        });

        if (order.payment?.status === 'PENDING' || order.payment?.status === 'FAILED') {
          await this.releasePromotionUsage(tx, (await tx.order.findUniqueOrThrow({
            where: { id: reservation.orderId },
            select: { promotionId: true },
          })).promotionId);
          await tx.payment.update({
            where: { orderId: reservation.orderId },
            data: { status: 'FAILED' },
          });
        }
      });
    }

    return { expiredOrders: expired.length };
  }

  private async releaseReservations(tx: Prisma.TransactionClient, orderId: string, status: InventoryReservationStatus) {
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
    for (const reservation of reservations) {
      if (!reservation.productInventoryId) continue;
      const updated = await tx.productInventory.updateMany({ where: { id: reservation.productInventoryId, reserved: { gte: reservation.quantity } }, data: { reserved: { decrement: reservation.quantity } } });
      if (updated.count !== 1) throw new BadRequestException(`Unable to release inventory reservation for product ${reservation.productId}`);
      await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status, releasedAt: new Date() } });
    }
  }

  private async releasePromotionUsage(tx: Prisma.TransactionClient, promotionId: string | null) {
    if (!promotionId) return;

    const updated = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "Promotion"
        SET "usageCount" = GREATEST("usageCount" - 1, 0),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${promotionId}
          AND "usageCount" > 0
      `,
    );

    if (Number(updated) !== 1) {
      throw new BadRequestException('Unable to release coupon reservation');
    }
  }

  private async consumeReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
    for (const reservation of reservations) {
      if (!reservation.productInventoryId) continue;
      const updated = await tx.productInventory.updateMany({ where: { id: reservation.productInventoryId, stock: { gte: reservation.quantity }, reserved: { gte: reservation.quantity } }, data: { stock: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } } });
      if (updated.count !== 1) throw new BadRequestException(`Unable to finalize inventory for product ${reservation.productId}`);
      await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status: 'CONSUMED', consumedAt: new Date(), releasedAt: null } });
    }
  }

  private findOneForTransaction(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, promotion: true, shippingRule: true } });
  }

  private generateOrderNumber() {
    return `ADV-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
