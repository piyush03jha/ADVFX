import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, NotificationType, PaymentStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { RazorpayService } from '../payments/razorpay.service';
import { PaymentsService } from '../payments/payments.service';
import { ObservabilityService } from '../observability/observability.service';
import { paymentWindowCutoff } from './payment-window';
import { remainingRefundMinor } from '../payments/refund-amount';

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

// Orders in these statuses have a captured payment behind them. Products are
// made to order, so there is no stock to put back on cancel/refund.
const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];
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
    private readonly payments: PaymentsService,
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

    const result = await this.prisma.$transaction(async (tx) => {
      const cart = checkoutItems
        ? null
        : await tx.cart.findUnique({
            where: { userId },
            include: {
              items: {
                where: { product: { status: "ACTIVE" } },
                include: {
                  variant: { include: { price: true } },
                  product: {
                    include: {
                      prices: {
                        where: { isActive: true, countryCode: null },
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
            promotion: true,
            shippingRule: true,
          },
        });
        if (raced) return raced;
      }

      if (quote.promotion?.id) {
        // Serialize all claims for this promotion, then count this customer's
        // non-cancelled orders in a fresh statement before consuming a use.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Promotion" WHERE "id" = ${quote.promotion.id} FOR UPDATE`);
        const customerLimitRows = await tx.$queryRaw<Array<{ usageLimitPerUser: number | null }>>(
          Prisma.sql`SELECT "usageLimitPerUser" FROM "Promotion" WHERE "id" = ${quote.promotion.id}`,
        );
        const customerLimit = customerLimitRows[0]?.usageLimitPerUser;
        if (customerLimit !== null && customerLimit !== undefined) {
          const customerUses = await tx.order.count({
            where: {
              userId,
              promotionId: quote.promotion.id,
              status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
            },
          });
          if (customerUses >= customerLimit) {
            throw new BadRequestException("You have reached the usage limit for this coupon");
          }
        }

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
          materialSnapshot: item.material ?? null,
          sizeSnapshot: item.size ?? item.variantName ?? null,
          taxRateBps: item.taxRateBps ?? 0,
          taxMinor: item.taxMinor ?? 0,
          manufacturingCostSnapshot: item.manufacturingCostSnapshot ?? Prisma.JsonNull,
          saleSnapshot: item.saleSnapshot ?? Prisma.JsonNull,
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
          roundingMinor: quote.summary.roundingMinor ?? 0,
          totalMinor: quote.summary.totalMinor,
          shippingRule: quote.shippingRule
            ? { connect: { id: quote.shippingRule.id } }
            : undefined,
          promotion: quote.promotion
            ? { connect: { id: quote.promotion.id } }
            : undefined,
          appliedCouponCode: quote.promotion?.code ?? null,
          shippingAddress: { connect: { id: address.id } },
          shippingAddressSnapshot: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
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

      // Cart contents remain available until payment is actually captured.
      // Successful payment clears only the purchased cart lines.
      return this.findOneForTransaction(tx, order.id);
    }).catch(async (error: unknown) => {
      // The unique constraint is the final arbiter when two replicas race on
      // the same idempotency key. Return the committed order instead of
      // surfacing a duplicate-order error to the client.
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await this.prisma.order.findFirst({
          where: { userId, idempotencyKey },
          include: {
            items: true,
            shippingAddress: true,
            payment: true,
            shipment: true,
            promotion: true,
            shippingRule: true,
          },
        });
        if (raced) return raced;
      }
      throw error;
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
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, shippingAddress: true, payment: true, shipment: true, promotion: true, shippingRule: true },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            media: {
              where: { type: 'IMAGE' },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { url: true },
            },
          },
        })
      : [];
    const imageByProduct = new Map(
      products.map((product) => [product.id, product.media[0]?.url ?? null]),
    );

    return orders.map((order) => ({
      ...order,
      shippingAddress: order.shippingAddress ?? order.shippingAddressSnapshot,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: imageByProduct.get(item.productId) ?? null,
      })),
    }));
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true, shippingAddress: true, payment: true, shipment: true, promotion: true, shippingRule: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(order.items.map((item) => item.productId))] } },
      select: {
        id: true,
        media: {
          where: { type: 'IMAGE' },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true },
        },
      },
    });
    const imageByProduct = new Map(
      products.map((product) => [product.id, product.media[0]?.url ?? null]),
    );

    return {
      ...order,
      shippingAddress: order.shippingAddress ?? order.shippingAddressSnapshot,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: imageByProduct.get(item.productId) ?? null,
      })),
    };
  }

  async findAllAdmin(
    status?: OrderStatus,
    page = 1,
    pageSize = ADMIN_ORDERS_PAGE_SIZE_DEFAULT,
  ) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize =
      Number.isInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, ADMIN_ORDERS_PAGE_SIZE_MAX)
        : ADMIN_ORDERS_PAGE_SIZE_DEFAULT;

    const where = status ? { status } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          shippingAddress: true,
          payment: true,
          shipment: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          promotion: true,
          shippingRule: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true, shippingAddress: true, payment: true, shipment: true, user: true, promotion: true, shippingRule: true } });
    if (!order) throw new NotFoundException('Order not found');
    return {
      ...order,
      shippingAddress: order.shippingAddress ?? order.shippingAddressSnapshot,
    };
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOneAdmin(id);
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(status)) throw new BadRequestException(`Cannot change order from ${order.status} to ${status}`);

    const wasPaid = PAID_STATUSES.includes(order.status);
    const hasCapturedPayment = order.payment?.status === 'CAPTURED';

    if (status === 'CANCELLED' && wasPaid && hasCapturedPayment) {
      // Cancelling here would leave a paid customer with no refund and no
      // order. Route through REFUNDED instead, which actually returns the
      // money (below).
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


    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Serialize admin state transitions. The initial read is intentionally
      // outside the transaction for fast validation, so re-check after locking
      // before mutating order, payment or shipment state.
      // Capture reconciliation locks Payment before Order. Refund transitions
      // follow the same lock order so they cannot deadlock with a capture webhook.
      if (status === 'REFUNDED') {
        await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT "id" FROM "Payment" WHERE "orderId" = ${id} FOR UPDATE`,
        );
      }
      await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`,
      );
      const current = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status !== order.status) {
        throw new ConflictException('Order status changed concurrently. Refresh and try again.');
      }
      if (!ORDER_TRANSITIONS[current.status].includes(status)) {
        throw new BadRequestException(`Cannot change order from ${current.status} to ${status}`);
      }

      if (status === 'REFUNDED') {
        const currentPayment = await tx.payment.findUnique({ where: { orderId: id } });
        if (
          !currentPayment ||
          currentPayment.status !== PaymentStatus.CAPTURED ||
          !currentPayment.providerPaymentId
        ) {
          throw new BadRequestException('Only captured Razorpay payments can be refunded.');
        }
        try {
          // Refund only what Razorpay has not already refunded, so a retry
          // after a half-finished attempt (refund sent, database update lost)
          // completes instead of failing on an over-refund.
          const providerPayment = await this.razorpay.fetchPayment(
            currentPayment.providerPaymentId,
          );
          const remainingMinor = remainingRefundMinor(
            currentPayment.amountMinor,
            providerPayment.amount_refunded,
          );
          if (remainingMinor > 0) {
            await this.razorpay.refundPayment(
              currentPayment.providerPaymentId,
              remainingMinor,
            );
          }
        } catch (error) {
          await this.observability.captureException(error, {
            alert: "refund_failure",
            orderId: id,
            providerPaymentId: currentPayment.providerPaymentId,
            amountMinor: currentPayment.amountMinor,
          });
          throw error;
        }
      }

      if (status === 'CANCELLED') {
        if (order.status === OrderStatus.PENDING_PAYMENT && order.promotionId) {
          await this.releasePromotionUsage(tx, order.promotionId);
        }
      }

      if (status === 'REFUNDED') {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: 'REFUNDED' },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'SHIPPED' ? { shipment: { upsert: { create: { status: 'SHIPPED', shippedAt: new Date() }, update: { status: 'SHIPPED', shippedAt: new Date() } } } } : {}),
          ...(status === 'DELIVERED' ? { shipment: { upsert: { create: { status: 'DELIVERED', deliveredAt: new Date() }, update: { status: 'DELIVERED', deliveredAt: new Date() } } } } : {}),
        },
        include: { items: true, shippingAddress: true, payment: true, shipment: true, user: true, promotion: true, shippingRule: true },
      });
    }, { timeout: 15_000, maxWait: 5_000 });

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

  async expireUnpaidOrders() {
    // Made-to-order products reserve nothing, so expiry is driven purely by
    // order age. Custom-build orders follow the same window.
    const expired = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lt: paymentWindowCutoff() },
      },
      select: { id: true },
      take: 200,
      orderBy: { createdAt: 'asc' },
    });

    for (const { id: expiredOrderId } of expired) {
      const order = await this.prisma.order.findUnique({
        where: { id: expiredOrderId },
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
            'Unable to reconcile Razorpay payment before order expiry',
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
          const result = await this.payments.reconcileCapturedPayment({
            orderId: order.id,
            providerPaymentId: captured.id,
            providerOrderId: order.payment.providerOrderId,
            amount: captured.amount,
            currency: captured.currency,
          });

          if (result.kind === 'CAPTURED' || result.kind === 'ALREADY_CAPTURED') {
            continue;
          }

          if (result.kind === 'REFUND_REQUIRED' && result.refunded) {
            continue;
          }

          await this.observability.captureMessage(
            'Captured Razorpay payment requires manual refund reconciliation',
            { alert: 'refund_reconciliation_pending', orderId: order.id },
          );
          continue;
        }

        if (providerPayments.some((payment) => payment.status === 'authorized')) {
          continue;
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${expiredOrderId} FOR UPDATE`);

        const current = await tx.order.findUnique({
          where: { id: expiredOrderId },
          select: {
            status: true,
            promotionId: true,
            payment: { select: { status: true } },
          },
        });

        if (current?.status !== OrderStatus.PENDING_PAYMENT) return;

        await tx.order.update({
          where: { id: expiredOrderId },
          data: { status: OrderStatus.CANCELLED },
        });

        // Coupon usage is a reservation too: always release it when the unpaid
        // order expires, regardless of the payment's last non-captured state.
        if (current.promotionId) {
          await this.releasePromotionUsage(tx, current.promotionId);
        }

        if (
          current.payment?.status === PaymentStatus.PENDING ||
          current.payment?.status === PaymentStatus.FAILED ||
          current.payment?.status === PaymentStatus.AUTHORIZED
        ) {
          await tx.payment.update({
            where: { orderId: expiredOrderId },
            data: { status: PaymentStatus.FAILED },
          });
        }
      });
    }

    const stuckPending = await this.prisma.order.count({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lt: paymentWindowCutoff(Date.now() - 25 * 60_000) },
      },
    });

    if (stuckPending > 0) {
      await this.observability.captureMessage(
        'Pending payment orders exceeded the expected payment window',
        {
          alert: 'stuck_pending_orders',
          count: stuckPending,
        },
      );
    }

    return { expiredOrders: expired.length, stuckPending };
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

  private findOneForTransaction(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shippingAddress: true, payment: true, shipment: true, promotion: true, shippingRule: true } });
  }

  private generateOrderNumber() {
    return `ADV-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}