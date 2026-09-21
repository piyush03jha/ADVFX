import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RazorpayService } from './razorpay.service';

type PayableOrder = Prisma.OrderGetPayload<{ include: { payment: true } }> & {
  payment: NonNullable<Prisma.OrderGetPayload<{ include: { payment: true } }>['payment']>;
};

type WebhookPayload = {
  event?: unknown;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
  };
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly notifications: NotificationsService,
  ) {}

  async createRazorpayOrder(userId: string, orderId: string) {
    const order = await this.getPayableOrder(userId, orderId);

    if (
      order.payment.providerOrderId &&
      order.payment.status !== PaymentStatus.FAILED
    ) {
      return this.formatRazorpayOrder(order);
    }

    const providerOrder = await this.razorpay.createOrder({
      amountMinor: order.payment.amountMinor,
      currency: order.payment.currency,
      receipt: order.orderNumber,
    });

    if (
      providerOrder.amount !== order.totalMinor ||
      providerOrder.currency !== order.currency
    ) {
      throw new ConflictException('Razorpay order total mismatch');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.create({
        data: {
          paymentId: order.payment.id,
          providerOrderId: providerOrder.id,
          amountMinor: providerOrder.amount,
          currency: providerOrder.currency,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          providerOrderId: providerOrder.id,
          status: PaymentStatus.PENDING,
          providerPaymentId: null,
          paidAt: null,
        },
      });
    });

    return {
      keyId: this.razorpay.getPublicKeyId(),
      razorpayOrderId: providerOrder.id,
      amount: providerOrder.amount,
      currency: providerOrder.currency,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  async cancelRazorpayPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { orderId: order.id, status: order.status, released: false };
    }

    if (order.payment?.provider === "RAZORPAY" && order.payment.providerOrderId) {
      let providerPayments;
      try {
        providerPayments = await this.razorpay.fetchPayments(order.payment.providerOrderId);
      } catch {
        return {
          orderId: order.id,
          status: order.status,
          refunded: false,
          released: false,
          reconciliationPending: true,
        };
      }

      const captured = providerPayments.find(
        (payment) =>
          payment.status === "captured" &&
          payment.amount === order.payment?.amountMinor &&
          payment.currency === order.payment?.currency,
      );

      if (captured) {
        const result = await this.applyCapturedPayment(
          order.id,
          captured.id,
          captured.id,
          order.payment.providerOrderId,
          captured.amount,
          captured.currency,
        );

        if (result.kind === "CAPTURED" && result.orderStatus === OrderStatus.CONFIRMED) {
          return {
            orderId: order.id,
            status: OrderStatus.CONFIRMED,
            refunded: false,
            released: false,
          };
        }

        await this.razorpay.refundPayment(captured.id, order.payment.amountMinor);
        return {
          orderId: order.id,
          status: OrderStatus.REFUNDED,
          refunded: true,
          released: false,
        };
      }

      const hasAuthorized = providerPayments.some(
        (payment) =>
          payment.status === "authorized" &&
          payment.amount === order.payment?.amountMinor &&
          payment.currency === order.payment?.currency,
      );

      if (hasAuthorized) {
        return {
          orderId: order.id,
          status: order.status,
          refunded: false,
          released: false,
          reconciliationPending: true,
        };
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: order.id },
        include: { payment: true },
      });
      if (!current || current.status !== OrderStatus.PENDING_PAYMENT) {
        return current;
      }

      await this.releaseReservationsInTransaction(tx, current.id);
      if (current.promotionId) {
        const count = await tx.$executeRaw(
          Prisma.sql`UPDATE "Promotion" SET "usageCount" = GREATEST("usageCount" - 1, 0), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${current.promotionId} AND "usageCount" > 0`,
        );
        if (Number(count) !== 1) {
          throw new ConflictException("Unable to release coupon reservation");
        }
      }

      await tx.order.update({
        where: { id: current.id },
        data: { status: OrderStatus.CANCELLED },
      });

      if (current.payment) {
        await tx.payment.update({
          where: { id: current.payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: current.id },
        include: { payment: true, shipment: true, inventoryReservations: true },
      });
    });

    return {
      orderId: updated?.id ?? order.id,
      status: updated?.status ?? "CANCELLED",
      refunded: false,
      released: true,
    };
  }

  async retryRazorpayPayment(userId: string, orderId: string) {
    const order = await this.getPayableOrder(userId, orderId);

    // A retry gets a fresh provider order, but we retain the previous provider
    // identifiers for reconciliation/audit instead of overwriting them.
    const refreshed = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: order.payment.id },
      });

      if (payment.status === PaymentStatus.PENDING && payment.providerOrderId) {
        throw new ConflictException(
          'A payment attempt is already active. Complete it or wait for its webhook before retrying.',
        );
      }

      await tx.paymentAttempt.updateMany({
        where: {
          paymentId: payment.id,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: null,
          providerOrderId: null,
          status: PaymentStatus.PENDING,
          paidAt: null,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { payment: true },
      });
    });

    return this.createRazorpayOrder(userId, refreshed.id);
  }

  async verifyRazorpayPayment(
    userId: string,
    input: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, userId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException("Order not found");
    if (!order.payment || order.payment.provider !== "RAZORPAY") {
      throw new BadRequestException("Razorpay payment is not configured");
    }

    if (
      !this.razorpay.verifyPaymentSignature({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      })
    ) {
      throw new BadRequestException("Invalid Razorpay payment signature");
    }

    if (
      order.payment.amountMinor !== order.totalMinor ||
      order.payment.currency !== order.currency
    ) {
      throw new BadRequestException("Payment total does not match order total");
    }

    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId: input.razorpayOrderId },
    });

    if (!attempt || attempt.paymentId !== order.payment.id) {
      throw new BadRequestException(
        "Razorpay payment attempt does not match this order",
      );
    }

    if (
      attempt.amountMinor !== order.payment.amountMinor ||
      attempt.currency !== order.payment.currency
    ) {
      throw new BadRequestException(
        "Payment attempt total does not match order total",
      );
    }

    const result = await this.applyCapturedPayment(
      order.id,
      input.razorpayPaymentId,
      input.razorpayPaymentId,
      input.razorpayOrderId,
      order.payment.amountMinor,
      order.payment.currency,
    );

    if (result.kind === "NONE") {
      throw new ConflictException("Unable to reconcile this payment");
    }

    return this.getVerifiedOrder(order.id);
  }

  async handleWebhook(rawBody: string, signature: string) {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const event = typeof payload.event === 'string' ? payload.event : '';

    switch (event) {
      case 'payment.captured': {
        const entity = payload.payload?.payment?.entity;
        await this.captureFromWebhook(
          typeof entity?.id === 'string' ? entity.id : undefined,
          typeof entity?.order_id === 'string' ? entity.order_id : undefined,
          typeof entity?.amount === 'number' ? entity.amount : undefined,
          typeof entity?.currency === 'string' ? entity.currency : undefined,
        );
        break;
      }
      case 'order.paid': {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderEntity = payload.payload?.order?.entity;
        await this.captureFromWebhook(
          typeof paymentEntity?.id === 'string' ? paymentEntity.id : undefined,
          typeof paymentEntity?.order_id === 'string'
            ? paymentEntity.order_id
            : typeof orderEntity?.id === 'string'
              ? orderEntity.id
              : undefined,
          typeof paymentEntity?.amount === 'number'
            ? paymentEntity.amount
            : undefined,
          typeof paymentEntity?.currency === 'string'
            ? paymentEntity.currency
            : undefined,
        );
        break;
      }
      case 'payment.failed': {
        const entity = payload.payload?.payment?.entity;
        const paymentId = typeof entity?.id === 'string' ? entity.id : undefined;
        const razorpayOrderId = typeof entity?.order_id === 'string' ? entity.order_id : undefined;

        const payment = razorpayOrderId
          ? await this.prisma.payment.findFirst({ where: { providerOrderId: razorpayOrderId } })
          : paymentId
            ? await this.prisma.payment.findFirst({ where: { providerPaymentId: paymentId } })
            : null;

        if (!payment || payment.status === PaymentStatus.CAPTURED) break;

        await this.prisma.$transaction(async (tx) => {
          const current = await tx.payment.findUnique({ where: { id: payment.id } });
          if (!current || current.status === PaymentStatus.CAPTURED) return;

          await tx.payment.update({
            where: { id: current.id },
            data: {
              providerPaymentId: paymentId ?? current.providerPaymentId,
              status: PaymentStatus.FAILED,
            },
          });

          const attempt = razorpayOrderId
            ? await tx.paymentAttempt.findUnique({ where: { providerOrderId: razorpayOrderId } })
            : null;

          if (attempt && attempt.status === PaymentStatus.PENDING) {
            await tx.paymentAttempt.update({
              where: { id: attempt.id },
              data: {
                providerPaymentId: paymentId ?? attempt.providerPaymentId,
                status: PaymentStatus.FAILED,
              },
            });
          }
        });

        // A failed attempt is not an order cancellation. The customer may
        // legitimately retry another payment method during the same checkout.
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async applyCapturedPayment(
    orderId: string,
    paymentId: string,
    providerPaymentId: string,
    providerOrderId: string,
    amount: number,
    currency: string,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { orderId },
      });
      if (!currentPayment) return { kind: 'NONE' as const };

      if (
        amount !== currentPayment.amountMinor ||
        currency !== currentPayment.currency
      ) {
        return { kind: 'NONE' as const };
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return { kind: 'NONE' as const };

      const attempt = await tx.paymentAttempt.findUnique({
        where: { providerOrderId },
      });

      if (order.status === OrderStatus.CONFIRMED && currentPayment.status === PaymentStatus.CAPTURED) {
        return { kind: 'ALREADY_CAPTURED' as const, orderStatus: order.status, paymentId };
      }

      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          providerPaymentId,
          providerOrderId,
          status: PaymentStatus.CAPTURED,
          paidAt: new Date(),
        },
      });

      if (attempt) {
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            providerPaymentId,
            status: PaymentStatus.CAPTURED,
          },
        });
      } else {
        await tx.paymentAttempt.create({
          data: {
            paymentId: currentPayment.id,
            providerOrderId,
            providerPaymentId,
            status: PaymentStatus.CAPTURED,
            amountMinor: amount,
            currency,
          },
        });
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return { kind: 'CAPTURED' as const, orderStatus: order.status, paymentId };
      }

      const activeReservation =
        order.checkoutSource === 'CUSTOM'
          ? true
          : Boolean(
              await tx.inventoryReservation.findFirst({
                where: {
                  orderId,
                  status: 'ACTIVE',
                  expiresAt: { gt: new Date() },
                },
              }),
            );

      if (!activeReservation) {
        return { kind: 'CAPTURED' as const, orderStatus: order.status, paymentId };
      }

      if (order.checkoutSource !== 'CUSTOM') {
        await this.consumeReservationsInTransaction(tx, orderId);
        await this.recordPurchaseMetricsInTransaction(tx, orderId);
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
        include: { items: true },
      });

      await this.clearCapturedCartLines(tx, updatedOrder);

      if (updatedOrder.checkoutSource === 'CUSTOM') {
        await tx.customRequest.updateMany({
          where: { orderId },
          data: { status: 'IN_PRODUCTION' },
        });
      }

      return { kind: 'CAPTURED' as const, orderStatus: updatedOrder.status, paymentId };
    });

    if (updated.kind === 'CAPTURED' && updated.orderStatus === OrderStatus.CONFIRMED) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (order?.userId) {
        await this.notifications.create(order.userId, {
          type: NotificationType.ORDER_CONFIRMED,
          title: 'Payment confirmed',
          message: `Order ${order.orderNumber} has been paid and confirmed.`,
          entityType: 'ORDER',
          entityId: order.id,
        });
      }
    }

    return updated;
  }

  private async captureFromWebhook(
    paymentId?: string,
    razorpayOrderId?: string,
    amount?: number,
    currency?: string,
  ) {
    if (!paymentId && !razorpayOrderId) return;

    const attempt = razorpayOrderId
      ? await this.prisma.paymentAttempt.findUnique({
          where: { providerOrderId: razorpayOrderId },
        })
      : paymentId
        ? await this.prisma.paymentAttempt.findFirst({
            where: { providerPaymentId: paymentId },
            orderBy: { createdAt: "desc" },
          })
        : null;

    if (!attempt) return;

    const resolvedAmount = typeof amount === "number" ? amount : attempt.amountMinor;
    const resolvedCurrency = currency ?? attempt.currency;

    if (
      resolvedAmount !== attempt.amountMinor ||
      resolvedCurrency !== attempt.currency
    ) {
      return;
    }

    return this.applyCapturedPayment(
      attempt.paymentId,
      paymentId ?? attempt.providerPaymentId ?? "",
      paymentId ?? attempt.providerPaymentId ?? "",
      attempt.providerOrderId,
      resolvedAmount,
      resolvedCurrency,
    );
  }

  private async clearCapturedCartLines(
    tx: Prisma.TransactionClient,
    order: { id: string; userId: string | null; checkoutSource: string; items: Array<{ productId: string; variantId: string | null; quantity: number }> },
  ) {
    if (order.checkoutSource !== "CART" || !order.userId) return;

    const cart = await tx.cart.findUnique({
      where: { userId: order.userId },
    });
    if (!cart) return;

    for (const item of order.items) {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId,
        },
      });

      if (!cartItem) continue;

      if (cartItem.quantity > item.quantity) {
        await tx.cartItem.update({
          where: { id: cartItem.id },
          data: { quantity: { decrement: item.quantity } },
        });
      } else {
        await tx.cartItem.delete({
          where: { id: cartItem.id },
        });
      }
    }
  }


  private async recordPurchaseMetricsInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });

    const totals = new Map<string, number>();
    for (const item of items) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }

    for (const [productId, unitsSold] of totals) {
      await tx.productMetrics.upsert({
        where: { productId },
        create: {
          productId,
          purchaseCount: 1,
          unitsSold,
        },
        update: {
          purchaseCount: { increment: 1 },
          unitsSold: { increment: unitsSold },
        },
      });
    }
  }

  private async consumeReservationsInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: "ACTIVE" },
    });

    for (const reservation of reservations) {
      if (!reservation.productInventoryId) continue;

      const updated = await tx.productInventory.updateMany({
        where: {
          id: reservation.productInventoryId,
          stock: { gte: reservation.quantity },
          reserved: { gte: reservation.quantity },
        },
        data: {
          stock: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          "Unable to finalize inventory for product " +
            reservation.productId,
        );
      }

      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: "CONSUMED",
          consumedAt: new Date(),
          releasedAt: null,
        },
      });
    }
  }

  private async releaseReservationsInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: "ACTIVE" },
    });

    for (const reservation of reservations) {
      if (!reservation.productInventoryId) continue;

      const updated = await tx.productInventory.updateMany({
        where: {
          id: reservation.productInventoryId,
          reserved: { gte: reservation.quantity },
        },
        data: { reserved: { decrement: reservation.quantity } },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          "Unable to release inventory for product " +
            reservation.productId,
        );
      }

      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });
    }
  }

  private async getPayableOrder(userId: string, orderId: string): Promise<PayableOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException('Order is no longer awaiting payment');
    }
    if (!order.payment || order.payment.provider !== 'RAZORPAY') {
      throw new ConflictException('Razorpay payment is not configured');
    }

    const activeReservation = await this.prisma.inventoryReservation.findFirst({
      where: {
        orderId: order.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeReservation) {
      throw new ConflictException(
        'This payment session has expired. Please create a new order from your cart.',
      );
    }

    return order as PayableOrder;
  }

  private formatRazorpayOrder(order: {
    id: string;
    orderNumber: string;
    totalMinor: number;
    currency: string;
    payment: {
      providerOrderId: string | null;
      amountMinor: number;
      currency: string;
    };
  }) {
    return {
      keyId: this.razorpay.getPublicKeyId(),
      razorpayOrderId: order.payment.providerOrderId,
      amount: order.payment.amountMinor,
      currency: order.payment.currency,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  private getVerifiedOrder(orderId: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, shippingAddress: true, payment: true, shipment: true },
    });
  }
}
