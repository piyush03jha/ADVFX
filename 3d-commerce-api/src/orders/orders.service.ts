import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryReservationStatus, OrderStatus, Prisma, NotificationType, PaymentStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { RazorpayService } from '../payments/razorpay.service';
import { ObservabilityService } from '../observability/observability.service';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED', 'REFUNDED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Orders in these statuses have already had stock *consumed* (decremented
// via consumeReservations), not just reserved. Cancelling/refunding from
// here must put that stock back - releaseReservations only finds
// still-ACTIVE reservations and is a no-op for these.
const STOCK_CONSUMED_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const RESERVATION_MINUTES = 30;
// findAllAdmin was previously fully unbounded (no take/skip at all), which
// fetches every order with deep includes on every admin page load - a
// growing perf/DoS risk. This caps it instead of paginating so the
// existing admin UI (which currently loads everything into the browser
// for client-side search/filtering) doesn't silently start hiding older
// orders from search. Raise this if you expect to exceed it, or switch
// the admin orders page to real server-side pagination.
const ADMIN_ORDERS_PAGE_SIZE_DEFAULT = 500;
const ADMIN_ORDERS_PAGE_SIZE_MAX = 500;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly pricing: PricingService,
    private readonly razorpay: RazorpayService,
    private readonly observability: ObservabilityService,
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
    selectedItems?: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }>,
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.order.findFirst({
        where: { userId, idempotencyKey },
        include: {
          items: true,
          shippingAddress: true,
          payment: true,
          shipment: true,
          inventoryReservations: true,
          promotion: true,
          shippingRule: true,
        },
      });
      if (existing) return existing;
    }

    const checkoutItems = selectedItems?.length
      ? selectedItems
      : undefined;

    const quote = await this.pricing.calculate(userId, {
      shippingAddressId,
      couponCode,
      items: checkoutItems,
    });

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
      const cart = checkoutItems
        ? null
        : await tx.cart.findUnique({
            where: { userId },
            include: {
              items: {
                include: {
                  variant: { include: { price: true, inventory: true } },
                  product: {
                    include: {
                      inventory: true,
                      prices: {
                        where: { isActive: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          });

      if (!checkoutItems && (!cart || cart.items.length === 0)) {
        throw new BadRequestException("Cart is empty");
      }

      const address = await tx.address.findFirst({
        where: { id: shippingAddressId, userId },
      });
      if (!address) throw new NotFoundException("Shipping address not found");

      const quoteMap = new Map(
        quote.items.map((item) => [
          item.productId + ":" + (item.variantId ?? "__base__"),
          item.quantity,
        ]),
      );

      if (cart) {
        const currentCart = new Map(
          cart.items.map((item) => [
            item.productId + ":" + (item.variantId ?? "__base__"),
            item.quantity,
          ]),
        );

        if (
          quoteMap.size !== currentCart.size ||
          Array.from(quoteMap.entries()).some(
            ([key, quantity]) => currentCart.get(key) !== quantity,
          )
        ) {
          throw new BadRequestException(
            "Cart changed while checkout was loading. Please refresh the quote and try again.",
          );
        }
      }

      if (idempotencyKey) {
        const raced = await tx.order.findFirst({
          where: { userId, idempotencyKey },
          include: {
            items: true,
            shippingAddress: true,
            payment: true,
            shipment: true,
            inventoryReservations: true,
            promotion: true,
            shippingRule: true,
          },
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
          throw new BadRequestException("Coupon usage limit has been reached");
        }
      }

      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] =
        quote.items.map((item) => ({
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
          checkoutSource: checkoutItems ? "BUY_NOW" : "CART",
          user: { connect: { id: userId } },
          status: "PENDING_PAYMENT",
          currency: quote.currency,
          subtotalMinor: quote.summary.subtotalMinor,
          discountMinor: quote.summary.discountMinor,
          shippingMinor: quote.summary.shippingMinor,
          taxMinor: quote.summary.taxMinor,
          totalMinor: quote.summary.totalMinor,
          shippingRule: quote.shippingRule
            ? { connect: { id: quote.shippingRule.id } }
            : undefined,
          promotion: quote.promotion
            ? { connect: { id: quote.promotion.id } }
            : undefined,
          appliedCouponCode: quote.promotion?.code ?? null,
          shippingAddress: { connect: { id: address.id } },
          items: { create: orderItems },
          payment: {
            create: {
              provider: "RAZORPAY",
              status: "PENDING",
              amountMinor: quote.summary.totalMinor,
              currency: quote.currency,
            },
          },
          shipment: { create: { status: "PENDING" } },
        },
        include: { items: true, shippingAddress: true },
      });

      for (const item of quote.items) {
        const inventory = item.variantId
          ? await tx.productVariant.findFirst({
              where: { id: item.variantId, productId: item.productId, isActive: true },
              select: { id: true, stock: true, reserved: true, trackStock: true, allowBackorder: true },
            })
          : await tx.productInventory.findFirst({
              where: { productId: item.productId },
            });

        if (!inventory || !inventory.trackStock || inventory.allowBackorder) {
          continue;
        }

        const updated = item.variantId
          ? await tx.$executeRaw(
              Prisma.sql`
                UPDATE "ProductVariant"
                SET "reserved" = "reserved" + ${item.quantity}
                WHERE "id" = ${item.variantId}
                  AND "isActive" = true
                  AND "trackStock" = true
                  AND "allowBackorder" = false
                  AND ("stock" - "reserved") >= ${item.quantity}
              `,
            )
          : await tx.$executeRaw(
              Prisma.sql`
                UPDATE "ProductInventory"
                SET "reserved" = "reserved" + ${item.quantity}
                WHERE "id" = ${inventory.id}
                  AND "trackStock" = true
                  AND "allowBackorder" = false
                  AND ("stock" - "reserved") >= ${item.quantity}
              `,
            );

        if (Number(updated) !== 1) {
          throw new BadRequestException(
            `Stock changed for "${item.productName}"; please try again`,
          );
        }

        await tx.inventoryReservation.create({
          data: {
            productId: item.productId,
            productVariantId: item.variantId ?? null,
            productInventoryId: item.variantId ? null : inventory.id,
            orderId: order.id,
            quantity: item.quantity,
            status: "ACTIVE",
            expiresAt,
          },
        });
      }

      // Cart contents remain available until payment is actually captured.
      // Successful payment clears only the purchased cart lines.
      return this.findOneForTransaction(tx, order.id);
    });

    if (result.userId) {
      await this.notifications.create(result.userId, {
        type: NotificationType.ORDER_CREATED,
        title: "Order created",
        message: `Order ${result.orderNumber} has been created and is awaiting payment.`,
        entityType: "ORDER",
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

  async findAllAdmin(status?: OrderStatus, page = 1, pageSize = ADMIN_ORDERS_PAGE_SIZE_DEFAULT) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize =
      Number.isInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, ADMIN_ORDERS_PAGE_SIZE_MAX)
        : ADMIN_ORDERS_PAGE_SIZE_DEFAULT;

    // Previously unbounded (`findMany` with no take/skip): as the order
    // table grows this fetches every order with deep includes on every
    // admin page load. Keeps the existing array response shape (so the
    // frontend doesn't need to change) but now always bounded.
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { items: true, shippingAddress: true, payment: true, shipment: true, inventoryReservations: true, user: true, promotion: true, shippingRule: true },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
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

    const wasStockConsumed = STOCK_CONSUMED_STATUSES.includes(order.status);
    const hasCapturedPayment = order.payment?.status === 'CAPTURED';

    if (status === 'CANCELLED' && wasStockConsumed && hasCapturedPayment) {
      // Cancelling here would leave a paid customer with no refund and no
      // order. Route through REFUNDED instead, which actually returns the
      // money (below) as well as restocking.
      throw new BadRequestException(
        'This order has a captured payment. Use REFUNDED to cancel and refund it.',
      );
    }

    if (status === 'REFUNDED') {
      if (
        !order.payment ||
        order.payment.status !== 'CAPTURED' ||
        !order.payment.providerPaymentId
      ) {
        throw new BadRequestException('Only captured Razorpay payments can be refunded.');
      }

      try {
        await this.razorpay.refundPayment(
          order.payment.providerPaymentId,
          order.payment.amountMinor,
        );
      } catch (error) {
        await this.observability.captureException(error, {
          alert: "refund_failure",
          orderId: id,
          providerPaymentId: order.payment.providerPaymentId,
          amountMinor: order.payment.amountMinor,
        });
        throw error;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED') {
        if (order.status === OrderStatus.PENDING_PAYMENT) {
          await this.releaseReservations(tx, id, InventoryReservationStatus.RELEASED);
          if (order.promotionId) {
            await this.releasePromotionUsage(tx, order.promotionId);
          }
        } else if (wasStockConsumed) {
          await this.restockConsumedReservations(tx, id);
        }
      }

      if (status === 'REFUNDED') {
        if (
          !order.payment ||
          order.payment.status !== 'CAPTURED' ||
          !order.payment.providerPaymentId
        ) {
          throw new BadRequestException('Only captured payments can be refunded.');
        }

        await tx.payment.update({
          where: { orderId: id },
          data: { status: 'REFUNDED' },
        });

        if (wasStockConsumed) {
          await this.restockConsumedReservations(tx, id);
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
      const order = await this.prisma.order.findUnique({
        where: { id: reservation.orderId },
        include: { payment: true },
      });

      if (!order || order.status !== OrderStatus.PENDING_PAYMENT) continue;

      if (
        order.payment?.provider === 'RAZORPAY' &&
        order.payment.providerOrderId
      ) {
        let providerPayments;
        try {
          providerPayments = await this.razorpay.fetchPayments(
            order.payment.providerOrderId,
          );
        } catch {
          await this.observability.captureMessage(
            'Unable to reconcile Razorpay payment before reservation expiry',
            { alert: 'payment_reconciliation_pending', orderId: order.id },
          );
          continue;
        }

        const captured = providerPayments.find(
          (payment) =>
            payment.status === 'captured' &&
            payment.amount === order.payment!.amountMinor &&
            payment.currency === order.payment!.currency,
        );

        if (captured?.id) {
          await this.observability.captureMessage(
            'Captured Razorpay payment found during reservation expiry; awaiting capture reconciliation',
            { alert: 'captured_payment_during_expiry', orderId: order.id },
          );
          continue;
        }

        if (providerPayments.some((payment) => payment.status === 'authorized')) {
          continue;
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await this.releaseReservations(
          tx,
          reservation.orderId,
          InventoryReservationStatus.EXPIRED,
        );

        const current = await tx.order.findUnique({
          where: { id: reservation.orderId },
          select: {
            status: true,
            promotionId: true,
            payment: { select: { status: true } },
          },
        });

        if (current?.status !== OrderStatus.PENDING_PAYMENT) return;

        await tx.order.update({
          where: { id: reservation.orderId },
          data: { status: OrderStatus.CANCELLED },
        });

        if (
          current.payment?.status === PaymentStatus.PENDING ||
          current.payment?.status === PaymentStatus.FAILED
        ) {
          if (current.promotionId) {
            await this.releasePromotionUsage(tx, current.promotionId);
          }

          await tx.payment.update({
            where: { orderId: reservation.orderId },
            data: { status: PaymentStatus.FAILED },
          });
        }
      });
    }

    const stuckPending = await this.prisma.order.count({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lt: new Date(Date.now() - 35 * 60_000) },
      },
    });

    if (stuckPending > 0) {
      await this.observability.captureMessage(
        'Pending payment orders exceeded the expected reservation window',
        {
          alert: 'stuck_pending_orders',
          count: stuckPending,
        },
      );
    }

    return { expiredOrders: expired.length, stuckPending };
  }

  private async releaseReservations(tx: Prisma.TransactionClient, orderId: string, status: InventoryReservationStatus) {
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
    for (const reservation of reservations) {
      if (reservation.productVariantId) {
        const updated = await tx.productVariant.updateMany({ where: { id: reservation.productVariantId, reserved: { gte: reservation.quantity } }, data: { reserved: { decrement: reservation.quantity } } });
        if (updated.count !== 1) throw new BadRequestException(`Unable to release inventory reservation for product ${reservation.productId}`);
      } else if (reservation.productInventoryId) {
        const updated = await tx.productInventory.updateMany({ where: { id: reservation.productInventoryId, reserved: { gte: reservation.quantity } }, data: { reserved: { decrement: reservation.quantity } } });
        if (updated.count !== 1) throw new BadRequestException(`Unable to release inventory reservation for product ${reservation.productId}`);
      } else continue;
      await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status, releasedAt: new Date() } });
    }
  }

  /**
   * Puts stock back for an order that had already reached a
   * STOCK_CONSUMED_STATUSES status (its reservations are CONSUMED, not
   * ACTIVE, so releaseReservations is a no-op for it) and is now being
   * cancelled or refunded. Without this, stock decremented at CONFIRMED
   * time was never returned on cancel/refund.
   */
  private async restockConsumedReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: 'CONSUMED' } });
    for (const reservation of reservations) {
      if (reservation.productVariantId) {
        await tx.productVariant.update({
          where: { id: reservation.productVariantId },
          data: { stock: { increment: reservation.quantity } },
        });
      } else if (reservation.productInventoryId) {
        await tx.productInventory.update({
          where: { id: reservation.productInventoryId },
          data: { stock: { increment: reservation.quantity } },
        });
      } else continue;
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: InventoryReservationStatus.RELEASED, releasedAt: new Date() },
      });
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
      if (reservation.productVariantId) {
        const updated = await tx.productVariant.updateMany({ where: { id: reservation.productVariantId, stock: { gte: reservation.quantity }, reserved: { gte: reservation.quantity } }, data: { stock: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } } });
        if (updated.count !== 1) throw new BadRequestException(`Unable to finalize inventory for product ${reservation.productId}`);
      } else if (reservation.productInventoryId) {
        const updated = await tx.productInventory.updateMany({ where: { id: reservation.productInventoryId, stock: { gte: reservation.quantity }, reserved: { gte: reservation.quantity } }, data: { stock: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } } });
        if (updated.count !== 1) throw new BadRequestException(`Unable to finalize inventory for product ${reservation.productId}`);
      } else continue;
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