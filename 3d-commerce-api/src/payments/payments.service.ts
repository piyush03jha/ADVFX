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
    // Claim the payment row in a short transaction. The external Razorpay call
    // happens only after this transaction commits, so provider latency does not
    // hold a PostgreSQL connection or row lock.
    const prepared = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true, payment: { select: { id: true } } },
      });
      if (!owned) throw new NotFoundException('Order not found');
      if (!owned.payment) throw new ConflictException('Razorpay payment is not configured');

      const order = await tx.order.findFirst({
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

      const activeReservation = order.checkoutSource === 'CUSTOM'
        ? true
        : await tx.inventoryReservation.findFirst({
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

      if (
        order.payment.providerOrderId &&
        order.payment.status !== PaymentStatus.FAILED &&
        order.payment.status !== PaymentStatus.CREATING
      ) {
        return {
          kind: 'EXISTING' as const,
          response: this.formatRazorpayOrder({ ...order, payment: order.payment }),
        };
      }

      if (order.payment.status === PaymentStatus.CREATING) {
        throw new ConflictException('Payment order creation is already in progress. Please retry shortly.');
      }

      const claimed = await tx.payment.updateMany({
        where: {
          id: order.payment.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        },
        data: {
          status: PaymentStatus.CREATING,
          providerOrderId: null,
          providerPaymentId: null,
          paidAt: null,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Payment state changed. Please refresh and try again.');
      }

      return {
        kind: 'CREATE' as const,
        paymentId: order.payment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalMinor: order.totalMinor,
        currency: order.currency,
        amountMinor: order.payment.amountMinor,
        paymentCurrency: order.payment.currency,
      };
    }, { timeout: 5_000, maxWait: 5_000 });

    if (prepared.kind === 'EXISTING') return prepared.response;

    let providerOrder: Awaited<ReturnType<RazorpayService['createOrder']>>;
    try {
      providerOrder = await this.razorpay.createOrder({
        amountMinor: prepared.amountMinor,
        currency: prepared.paymentCurrency,
        receipt: prepared.orderNumber,
      });
    } catch (error) {
      await this.prisma.payment.updateMany({
        where: { id: prepared.paymentId, status: PaymentStatus.CREATING },
        data: { status: PaymentStatus.PENDING },
      }).catch(() => undefined);
      throw error;
    }

    if (
      providerOrder.amount !== prepared.totalMinor ||
      providerOrder.currency !== prepared.currency
    ) {
      await this.prisma.payment.updateMany({
        where: { id: prepared.paymentId, status: PaymentStatus.CREATING },
        data: { status: PaymentStatus.FAILED },
      });
      throw new ConflictException('Razorpay order total mismatch');
    }

    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: prepared.orderId, userId },
          include: { payment: true },
        });
        if (
          !order ||
          order.status !== OrderStatus.PENDING_PAYMENT ||
          !order.payment ||
          order.payment.id !== prepared.paymentId ||
          order.payment.status !== PaymentStatus.CREATING
        ) {
          return null;
        }

        await tx.paymentAttempt.create({
          data: {
            paymentId: prepared.paymentId,
            providerOrderId: providerOrder.id,
            amountMinor: providerOrder.amount,
            currency: providerOrder.currency,
            status: PaymentStatus.PENDING,
          },
        });

        const updated = await tx.payment.updateMany({
          where: { id: prepared.paymentId, status: PaymentStatus.CREATING },
          data: {
            providerOrderId: providerOrder.id,
            status: PaymentStatus.PENDING,
            providerPaymentId: null,
            paidAt: null,
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Payment state changed while preparing Razorpay order');
        }

        return {
          keyId: this.razorpay.getPublicKeyId(),
          razorpayOrderId: providerOrder.id,
          amount: providerOrder.amount,
          currency: providerOrder.currency,
          orderId: order.id,
          orderNumber: order.orderNumber,
        };
      }, { timeout: 5_000, maxWait: 5_000 });

      if (!saved) {
        await this.prisma.payment.updateMany({
          where: { id: prepared.paymentId, status: PaymentStatus.CREATING },
          data: { status: PaymentStatus.FAILED },
        });
        throw new ConflictException('Order changed while preparing payment. Please retry checkout.');
      }
      return saved;
    } catch (error) {
      await this.prisma.payment.updateMany({
        where: { id: prepared.paymentId, status: PaymentStatus.CREATING },
        data: { status: PaymentStatus.FAILED },
      }).catch(() => undefined);
      throw error;
    }
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
          order.payment.providerOrderId,
          captured.amount,
          captured.currency,
        );

        if (
          (result.kind === "CAPTURED" || result.kind === "ALREADY_CAPTURED") &&
          result.orderStatus === OrderStatus.CONFIRMED
        ) {
          return { orderId: order.id, status: OrderStatus.CONFIRMED, refunded: false, released: false };
        }

        // Never refund a payment just because reconciliation returned a non-CAPTURED
        // result. Refund only an explicitly classified late/duplicate capture, and
        // atomically claim the attempt so webhook/cancel/verify cannot double-refund.
        if (result.kind !== "REFUND_REQUIRED") {
          return { orderId: order.id, status: order.status, refunded: false, released: false, reconciliationPending: true };
        }

        const claimed = await this.prisma.paymentAttempt.updateMany({
          where: {
            providerOrderId: order.payment.providerOrderId,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED] },
          },
          data: { refundProviderPaymentId: captured.id, status: PaymentStatus.REFUND_PENDING },
        });
        if (claimed.count !== 1) {
          return { orderId: order.id, status: order.status, refunded: false, released: false, reconciliationPending: true };
        }

        try {
          await this.razorpay.refundPayment(captured.id, order.payment.amountMinor);
          await this.prisma.paymentAttempt.updateMany({
            where: { providerOrderId: order.payment.providerOrderId, status: PaymentStatus.REFUND_PENDING },
            data: { status: PaymentStatus.REFUNDED },
          });
          if (!result.duplicatePayment) {
            await this.prisma.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
          }
        } catch (error) {
          console.error("Razorpay refund failed during cancellation; attempt remains REFUND_PENDING", { orderId: order.id, providerPaymentId: captured.id, error });
          return { orderId: order.id, status: order.status, refunded: false, released: false, reconciliationPending: true };
        }

        let finalStatus: OrderStatus = result.orderStatus;
        if (!result.duplicatePayment) {
          const finalOrder = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`);
            const current = await tx.order.findUnique({ where: { id: order.id }, select: { status: true, promotionId: true } });
            if (current?.status !== OrderStatus.PENDING_PAYMENT) return current;
            await this.releaseReservationsInTransaction(tx, order.id);
            if (current.promotionId) {
              await tx.$executeRaw(Prisma.sql`UPDATE "Promotion" SET "usageCount" = GREATEST("usageCount" - 1, 0), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${current.promotionId} AND "usageCount" > 0`);
            }
            return tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED }, select: { status: true, promotionId: true } });
          });
          finalStatus = finalOrder?.status ?? finalStatus;
        }
        return { orderId: order.id, status: finalStatus, refunded: true, released: false };
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

      if (payment.status === PaymentStatus.CREATING) {
        throw new ConflictException('A payment order is already being prepared. Please retry shortly.');
      }
      if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.FAILED) {
        throw new ConflictException('This payment cannot be retried in its current state.');
      }

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

    if (order.payment.providerOrderId !== input.razorpayOrderId) {
      throw new BadRequestException(
        "Razorpay payment order does not match the current payment attempt",
      );
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

    const providerPayment = await this.razorpay.fetchPayment(
      input.razorpayPaymentId,
    );

    if (providerPayment.id !== input.razorpayPaymentId) {
      throw new BadRequestException("Razorpay payment ID does not match");
    }

    if (providerPayment.order_id !== input.razorpayOrderId) {
      throw new BadRequestException(
        "Razorpay payment belongs to a different Razorpay order",
      );
    }

    if (
      providerPayment.amount !== order.payment.amountMinor ||
      providerPayment.currency !== order.payment.currency
    ) {
      throw new BadRequestException(
        "Razorpay payment amount or currency does not match the order",
      );
    }

    if (providerPayment.status !== "captured") {
      throw new ConflictException(
        "Razorpay payment has not been captured yet",
      );
    }

    const result = await this.applyCapturedPayment(
      order.id,
      input.razorpayPaymentId,
      input.razorpayOrderId,
      attempt.amountMinor,
      attempt.currency,
    );

    if (result.kind === "REFUND_REQUIRED") {
      const claimed = await this.prisma.paymentAttempt.updateMany({
        where: {
          providerOrderId: input.razorpayOrderId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED] },
        },
        data: { refundProviderPaymentId: result.providerPaymentId, status: PaymentStatus.REFUND_PENDING },
      });
      if (claimed.count === 1) {
        try {
          await this.razorpay.refundPayment(result.providerPaymentId, attempt.amountMinor);
          await this.prisma.paymentAttempt.updateMany({
            where: { providerOrderId: input.razorpayOrderId, status: PaymentStatus.REFUND_PENDING },
            data: { status: PaymentStatus.REFUNDED },
          });
          if (!result.duplicatePayment) {
            await this.prisma.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
          }
        } catch (error) {
          // Leave the attempt claimed as REFUND_PENDING after ambiguous provider errors.
          console.error("Razorpay refund failed after payment verification; reconciliation required", { orderId: order.id, providerPaymentId: result.providerPaymentId, error });
          throw new ConflictException("Payment was received but refund reconciliation is pending. Please contact support.");
        }
      }
    }
    if (result.kind === "NONE") {
      throw new ConflictException("Unable to reconcile this payment");
    }

    const verified = await this.getVerifiedOrder(order.id);
    return {
      orderId: verified.id,
      orderNumber: verified.orderNumber,
      orderStatus: verified.status,
      payment: verified.payment,
      totalMinor: verified.totalMinor,
      currency: verified.currency,
    };
  }

  async recoverStaleOrderCreations() {
    const staleBefore = new Date(Date.now() - 2 * 60_000);
    const result = await this.prisma.payment.updateMany({
      where: {
        status: PaymentStatus.CREATING,
        updatedAt: { lt: staleBefore },
      },
      data: { status: PaymentStatus.FAILED },
    });
    return { releasedClaims: result.count };
  }

  /**
   * Reconcile ambiguous refund outcomes against Razorpay before an operator
   * considers retrying them. A timeout may happen after the provider accepted
   * the original request, so this routine never blindly issues a second refund.
   */
  async recoverPendingRefunds() {
    const attempts = await this.prisma.paymentAttempt.findMany({
      where: { status: PaymentStatus.REFUND_PENDING, refundProviderPaymentId: { not: null } },
      include: { payment: true },
      take: 100,
      orderBy: { updatedAt: "asc" },
    });
    let reconciled = 0;

    for (const attempt of attempts) {
      if (!attempt.refundProviderPaymentId) continue;
      try {
        const providerPayment = await this.razorpay.fetchPayment(attempt.refundProviderPaymentId);
        if ((providerPayment.amount_refunded ?? 0) < attempt.amountMinor) continue;

        const updated = await this.prisma.paymentAttempt.updateMany({
          where: { id: attempt.id, status: PaymentStatus.REFUND_PENDING },
          data: { status: PaymentStatus.REFUNDED },
        });
        if (updated.count !== 1) continue;

        if (attempt.payment.providerPaymentId === attempt.refundProviderPaymentId) {
          await this.prisma.payment.updateMany({
            where: {
              id: attempt.paymentId,
              providerPaymentId: attempt.refundProviderPaymentId,
              status: { in: [PaymentStatus.CAPTURED, PaymentStatus.REFUND_PENDING] },
            },
            data: { status: PaymentStatus.REFUNDED },
          });
        }
        reconciled += 1;
      } catch (error) {
        console.error("Pending Razorpay refund reconciliation failed", {
          attemptId: attempt.id,
          providerPaymentId: attempt.refundProviderPaymentId,
          error,
        });
      }
    }

    return { checked: attempts.length, reconciled };
  }

  async reconcileCapturedPayment(input: {
    orderId: string;
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
  }) {
    const result = await this.applyCapturedPayment(
      input.orderId,
      input.providerPaymentId,
      input.providerOrderId,
      input.amount,
      input.currency,
    );

    if (result.kind === "REFUND_REQUIRED") {
      const claimed = await this.prisma.paymentAttempt.updateMany({
        where: {
          providerOrderId: input.providerOrderId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED] },
        },
        data: {
          refundProviderPaymentId: input.providerPaymentId,
          status: PaymentStatus.REFUND_PENDING,
        },
      });
      if (claimed.count !== 1) {
        return { ...result, refunded: false, refundPending: true };
      }

      try {
        await this.razorpay.refundPayment(result.providerPaymentId, input.amount);
        await this.prisma.paymentAttempt.updateMany({
          where: { providerOrderId: input.providerOrderId, status: PaymentStatus.REFUND_PENDING },
          data: { refundProviderPaymentId: input.providerPaymentId, status: PaymentStatus.REFUNDED },
        });
        if (!result.duplicatePayment) {
          await this.prisma.payment.update({
            where: { orderId: input.orderId },
            data: { status: PaymentStatus.REFUNDED },
          });
        }
        return { ...result, refunded: true };
      } catch (error) {
        console.error("Razorpay refund needs manual reconciliation", {
          orderId: input.orderId,
          providerPaymentId: result.providerPaymentId,
          error,
        });
        // Keep REFUND_PENDING to avoid an automatic duplicate refund after an
        // ambiguous network timeout. Operations must reconcile this attempt.
        return { ...result, refunded: false, refundPending: true };
      }
    }

    return result;
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
          // Serialize failed-payment processing with capture reconciliation so a
          // late payment.failed webhook cannot overwrite a captured payment.
          await tx.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`,
          );

          const current = await tx.payment.findUnique({ where: { id: payment.id } });
          if (!current) return;

          const attempt = razorpayOrderId
            ? await tx.paymentAttempt.findUnique({ where: { providerOrderId: razorpayOrderId } })
            : null;

          // Always reconcile the specific failed attempt, but never let a delayed
          // failure from an older Razorpay order mark a newer attempt as failed.
          if (attempt && attempt.status === PaymentStatus.PENDING) {
            await tx.paymentAttempt.update({
              where: { id: attempt.id },
              data: {
                providerPaymentId: paymentId ?? attempt.providerPaymentId,
                status: PaymentStatus.FAILED,
              },
            });
          }

          if (
            current.status === PaymentStatus.CAPTURED ||
            (razorpayOrderId && current.providerOrderId !== razorpayOrderId)
          ) return;

          await tx.payment.update({
            where: { id: current.id },
            data: {
              providerPaymentId: paymentId ?? current.providerPaymentId,
              status: PaymentStatus.FAILED,
            },
          });
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
    providerPaymentId: string,
    providerOrderId: string,
    amount: number,
    currency: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize browser verification and webhook reconciliation for the same
      // payment. Without the row lock, both callers can observe an uncaptured
      // payment and one can incorrectly enter the refund path after the other
      // has already confirmed the order.
      const lockedPaymentRows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT "id" FROM "Payment" WHERE "orderId" = ${orderId} FOR UPDATE`,
      );

      if (lockedPaymentRows.length === 0) {
        return { kind: "NONE" as const };
      }

      const payment = await tx.payment.findUnique({
        where: { id: lockedPaymentRows[0].id },
      });
      if (!payment) return { kind: "NONE" as const };

      if (
        amount !== payment.amountMinor ||
        currency !== payment.currency
      ) {
        return { kind: "NONE" as const };
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return { kind: "NONE" as const };

      if (
        payment.status === PaymentStatus.CAPTURED &&
        payment.providerPaymentId === providerPaymentId
      ) {
        return {
          kind: "ALREADY_CAPTURED" as const,
          orderStatus: order.status,
          providerPaymentId,
        };
      }

      if (
        payment.status === PaymentStatus.CAPTURED &&
        payment.providerPaymentId !== providerPaymentId
      ) {
        return {
          kind: "REFUND_REQUIRED" as const,
          duplicatePayment: true as const,
          orderStatus: order.status,
          providerPaymentId,
        };
      }

      const attempt = await tx.paymentAttempt.findUnique({
        where: { providerOrderId },
      });

      // A capture must be tied to a persisted attempt belonging to this payment.
      // Never trust an event merely because its amount and currency happen to match.
      if (
        !attempt ||
        attempt.paymentId !== payment.id ||
        attempt.amountMinor !== amount ||
        attempt.currency !== currency
      ) {
        return { kind: "NONE" as const };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerOrderId,
          providerPaymentId,
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
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return {
          kind: "REFUND_REQUIRED" as const,
          duplicatePayment: false as const,
          orderStatus: order.status,
          providerPaymentId,
        };
      }

      const reservation = await tx.inventoryReservation.findFirst({
        where: {
          orderId,
          status: "ACTIVE",
        },
      });

      if (!reservation && order.checkoutSource !== "CUSTOM") {
        return {
          kind: "REFUND_REQUIRED" as const,
          duplicatePayment: false as const,
          orderStatus: order.status,
          providerPaymentId,
        };
      }

      if (order.checkoutSource !== "CUSTOM") {
        await this.consumeReservationsInTransaction(tx, orderId);
        await this.recordPurchaseMetricsInTransaction(tx, orderId);
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
        include: { items: true },
      });

      await this.clearCapturedCartLines(tx, updatedOrder);

      if (updatedOrder.checkoutSource === "CUSTOM") {
        await tx.customRequest.updateMany({
          where: { orderId },
          data: { status: "IN_PRODUCTION" },
        });
      }

      return {
        kind: "CAPTURED" as const,
        orderStatus: updatedOrder.status,
        providerPaymentId,
      };
    });

    if (result.kind === "CAPTURED" && result.orderStatus === OrderStatus.CONFIRMED) {
      const confirmedOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (confirmedOrder?.userId) {
        await this.notifications.create(confirmedOrder.userId, {
          type: NotificationType.ORDER_CONFIRMED,
          title: "Payment confirmed",
          message: `Order ${confirmedOrder.orderNumber} has been paid and confirmed.`,
          entityType: "ORDER",
          entityId: confirmedOrder.id,
        });
      }
    }

    return result;
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
          include: { payment: { select: { orderId: true } } },
        })
      : paymentId
        ? await this.prisma.paymentAttempt.findFirst({
            where: { providerPaymentId: paymentId },
            orderBy: { createdAt: "desc" },
            include: { payment: { select: { orderId: true } } },
          })
        : null;

    if (!attempt) return;
    // A previously refunded provider attempt must not trigger another refund
    // when Razorpay redelivers the same captured event.
    if (attempt.status === PaymentStatus.REFUNDED) return;

    const resolvedAmount =
      typeof amount === "number" ? amount : attempt.amountMinor;
    const resolvedCurrency = currency ?? attempt.currency;

    if (
      resolvedAmount !== attempt.amountMinor ||
      resolvedCurrency !== attempt.currency
    ) {
      return;
    }

    const result = await this.applyCapturedPayment(
      attempt.payment.orderId,
      paymentId ?? attempt.providerPaymentId ?? "",
      attempt.providerOrderId,
      resolvedAmount,
      resolvedCurrency,
    );

    if (result.kind === "REFUND_REQUIRED") {
      // Claim the attempt before calling Razorpay. Only one webhook/browser
      // reconciliation may move it into REFUND_PENDING; duplicate deliveries
      // must not create multiple provider refunds.
      const claimed = await this.prisma.paymentAttempt.updateMany({
        where: {
          providerOrderId: attempt.providerOrderId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED] },
        },
        data: {
          refundProviderPaymentId: result.providerPaymentId,
          status: PaymentStatus.REFUND_PENDING,
        },
      });
      if (claimed.count !== 1) return;

      try {
        await this.razorpay.refundPayment(result.providerPaymentId, resolvedAmount);
        await this.prisma.paymentAttempt.updateMany({
          where: { providerOrderId: attempt.providerOrderId, status: PaymentStatus.REFUND_PENDING },
          data: { refundProviderPaymentId: result.providerPaymentId, status: PaymentStatus.REFUNDED },
        });
        if (!result.duplicatePayment) {
          await this.prisma.payment.update({
            where: { orderId: attempt.payment.orderId },
            data: { status: PaymentStatus.REFUNDED },
          });
        }
      } catch (error) {
        await this.notifications.create(
          (await this.prisma.order.findUnique({ where: { id: attempt.payment.orderId }, select: { userId: true } }))?.userId ?? "",
          {
            type: NotificationType.PAYMENT_FAILED,
            title: "Payment reconciliation requires attention",
            message: `Payment ${result.providerPaymentId} refund needs manual reconciliation.`,
            entityType: "ORDER",
            entityId: attempt.payment.orderId,
          },
        ).catch(() => undefined);
        // Leave REFUND_PENDING: an API timeout can happen after Razorpay has
        // accepted the refund. Do not automatically issue a potentially
        // duplicate refund; reconcile this state against the provider dashboard.
      }
    }
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
      let updated: { count: number };

      if (reservation.productVariantId) {
        updated = await tx.productVariant.updateMany({
          where: {
            id: reservation.productVariantId,
            stock: { gte: reservation.quantity },
            reserved: { gte: reservation.quantity },
          },
          data: {
            stock: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
          },
        });
      } else if (reservation.productInventoryId) {
        updated = await tx.productInventory.updateMany({
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
      } else {
        throw new BadRequestException(
          "Inventory reservation has no inventory target for product " +
            reservation.productId,
        );
      }

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
      let updated: { count: number };

      if (reservation.productVariantId) {
        updated = await tx.productVariant.updateMany({
          where: {
            id: reservation.productVariantId,
            reserved: { gte: reservation.quantity },
          },
          data: { reserved: { decrement: reservation.quantity } },
        });
      } else if (reservation.productInventoryId) {
        updated = await tx.productInventory.updateMany({
          where: {
            id: reservation.productInventoryId,
            reserved: { gte: reservation.quantity },
          },
          data: { reserved: { decrement: reservation.quantity } },
        });
      } else {
        throw new BadRequestException(
          "Inventory reservation has no inventory target for product " +
            reservation.productId,
        );
      }

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

    const activeReservation = order.checkoutSource === "CUSTOM"
      ? true
      : await this.prisma.inventoryReservation.findFirst({
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
