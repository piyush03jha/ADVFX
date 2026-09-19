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

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        providerOrderId: providerOrder.id,
        status: PaymentStatus.PENDING,
        providerPaymentId: null,
        paidAt: null,
      },
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

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: null,
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

    if (!order) throw new NotFoundException('Order not found');
    if (!order.payment || order.payment.provider !== 'RAZORPAY') {
      throw new BadRequestException('Razorpay payment is not configured');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException('Order is no longer awaiting payment');
    }

    const activeReservation = await this.prisma.inventoryReservation.findFirst({
      where: {
        orderId: order.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeReservation) {
      throw new ConflictException('This payment session has expired. Please create a new order from your cart.');
    }

    if (order.payment.status === PaymentStatus.CAPTURED) {
      if (
        order.payment.providerPaymentId === input.razorpayPaymentId &&
        order.payment.providerOrderId === input.razorpayOrderId
      ) {
        return this.getVerifiedOrder(order.id);
      }
      throw new ConflictException('Order has already been paid');
    }

    if (order.payment.providerOrderId !== input.razorpayOrderId) {
      throw new BadRequestException('Razorpay order does not match this order');
    }

    if (
      order.payment.amountMinor !== order.totalMinor ||
      order.payment.currency !== order.currency
    ) {
      throw new BadRequestException('Payment total does not match order total');
    }

    if (
      !this.razorpay.verifyPaymentSignature({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      })
    ) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { orderId: order.id },
      });

      if (!payment) throw new NotFoundException('Payment not found');

      if (payment.status === PaymentStatus.CAPTURED) {
        const existingOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            items: true,
            shippingAddress: true,
            payment: true,
            shipment: true,
          },
        });

        return {
          order: existingOrder,
          payment: existingOrder.payment,
          captured: false,
        };
      }

      const claimed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          providerOrderId: input.razorpayOrderId,
          providerPaymentId: input.razorpayPaymentId,
          status: PaymentStatus.CAPTURED,
          paidAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        const existingOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            items: true,
            shippingAddress: true,
            payment: true,
            shipment: true,
          },
        });

        return {
          order: existingOrder,
          payment: existingOrder.payment,
          captured: false,
        };
      }

      const savedPayment = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });

      await this.consumeReservationsInTransaction(tx, order.id);
      await this.recordPurchaseMetricsInTransaction(tx, order.id);

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
        include: {
          items: true,
          shippingAddress: true,
          payment: true,
          shipment: true,
        },
      });

      return {
        order: updatedOrder,
        payment: savedPayment,
        captured: true,
      };
    });

    if (updated.captured) {
      await this.incrementPromotionUsageAfterPayment(order.id);
    }

    if (updated.order.userId && updated.captured) {
      await this.notifications.create(updated.order.userId, {
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Payment confirmed',
        message: `Order ${updated.order.orderNumber} has been paid and confirmed.`,
        entityType: 'ORDER',
        entityId: updated.order.id,
      });
    }

    return {
      orderId: updated.order.id,
      orderNumber: updated.order.orderNumber,
      orderStatus: updated.order.status,
      payment: updated.payment,
      totalMinor: updated.order.totalMinor,
      currency: updated.order.currency,
    };
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
        const paymentId =
          typeof entity?.id === 'string' ? entity.id : undefined;
        const razorpayOrderId =
          typeof entity?.order_id === 'string' ? entity.order_id : undefined;

        const payment = razorpayOrderId
          ? await this.prisma.payment.findFirst({
              where: { providerOrderId: razorpayOrderId },
            })
          : paymentId
            ? await this.prisma.payment.findFirst({
                where: { providerPaymentId: paymentId },
              })
            : null;

        if (!payment || payment.status === PaymentStatus.CAPTURED) break;

        await this.prisma.$transaction(async (tx) => {
          const current = await tx.payment.findUnique({
            where: { id: payment.id },
          });
          if (!current || current.status === PaymentStatus.CAPTURED) return;

          await tx.payment.update({
            where: { id: current.id },
            data: {
              providerPaymentId: paymentId ?? current.providerPaymentId,
              status: PaymentStatus.FAILED,
            },
          });

          const order = await tx.order.findUnique({
            where: { id: current.orderId },
            select: { status: true },
          });

          if (order?.status === OrderStatus.PENDING_PAYMENT) {
            await this.releaseReservationsInTransaction(tx, current.orderId);
            await tx.order.update({
              where: { id: current.orderId },
              data: { status: OrderStatus.CANCELLED },
            });
          }
        });
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async captureFromWebhook(
    paymentId?: string,
    razorpayOrderId?: string,
    amount?: number,
    currency?: string,
  ) {
    if (!paymentId && !razorpayOrderId) return;

    const payment = razorpayOrderId
      ? await this.prisma.payment.findFirst({
          where: { providerOrderId: razorpayOrderId },
        })
      : paymentId
        ? await this.prisma.payment.findFirst({
            where: { providerPaymentId: paymentId },
          })
        : null;

    if (!payment) return;
    if (payment.status === PaymentStatus.CAPTURED) return;

    if (
      (typeof amount === 'number' && amount !== payment.amountMinor) ||
      (currency && currency !== payment.currency)
    ) {
      return;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
      });
      if (!current) return null;
      if (current.status === PaymentStatus.CAPTURED) return null;

      const claimed = await tx.payment.updateMany({
        where: {
          id: current.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          providerOrderId: razorpayOrderId ?? current.providerOrderId,
          providerPaymentId: paymentId ?? current.providerPaymentId,
          status: PaymentStatus.CAPTURED,
          paidAt: new Date(),
        },
      });

      if (claimed.count !== 1) return null;

      const savedPayment = await tx.payment.findUniqueOrThrow({
        where: { id: current.id },
      });

      const order = await tx.order.findUnique({
        where: { id: current.orderId },
      });
      if (!order || order.status !== OrderStatus.PENDING_PAYMENT) {
        return { order, payment: savedPayment };
      }

      await this.consumeReservationsInTransaction(tx, order.id);
      await this.recordPurchaseMetricsInTransaction(tx, order.id);

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
      });

      return { order: updatedOrder, payment: savedPayment };
    });

    if (!updated?.order || !('id' in updated.order)) return;

    await this.incrementPromotionUsageAfterPayment(updated.order.id);
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

  private async incrementPromotionUsageAfterPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { promotionId: true },
    });

    if (!order?.promotionId) return;

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Promotion"
        SET "usageCount" = "usageCount" + 1
        WHERE "id" = ${order.promotionId}
          AND "isActive" = true
          AND (
            "usageLimit" IS NULL
            OR "usageCount" < "usageLimit"
          )
      `,
    );
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
