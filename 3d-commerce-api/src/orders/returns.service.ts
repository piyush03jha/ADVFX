import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { RazorpayService } from '../payments/razorpay.service';
import { canTransitionReturn, isReturnStatus } from './return-transitions';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async create(
    userId: string,
    orderId: string,
    dto: CreateReturnRequestDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException(
        'Returns can only be requested for delivered orders',
      );
    }

    try {
      return await this.prisma.returnRequest.create({
        data: {
          orderId,
          userId,
          reason: dto.reason.trim(),
          note: dto.note?.trim() || null,
        },
      });
    } catch (error) {
      // orderId is unique; concurrent return submissions should return 409.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('A return request already exists for this order.');
      }
      throw error;
    }
  }

  async mine(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.returnRequest.findMany({
      include: {
        user: true,
        order: {
          include: {
            items: true,
            payment: true,
            shipment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED',
  ) {
    // The controller passes the raw body value through, so reject anything
    // that is not a real return status instead of letting Prisma 500 on it.
    if (!isReturnStatus(status)) {
      throw new BadRequestException('Invalid return status');
    }

    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
    }

    if (!canTransitionReturn(request.status, status)) {
      throw new BadRequestException(
        `Cannot change a return from ${request.status} to ${status}`,
      );
    }

    if (status === 'REFUNDED') {
      const payment = request.orderId
        ? await this.prisma.payment.findUnique({
            where: { orderId: request.orderId },
          })
        : null;

      if (
        !payment ||
        payment.status !== 'CAPTURED' ||
        !payment.providerPaymentId
      ) {
        throw new BadRequestException(
          'A return can only be refunded after a captured payment exists.',
        );
      }

      // Refund only what Razorpay has not already refunded. If an earlier
      // attempt reached Razorpay but failed before the database was updated
      // (or the admin double-clicked), refunding the full amount again would
      // be rejected and leave the return stuck. The money is already back, so
      // just finish the bookkeeping.
      const providerPayment = await this.razorpay.fetchPayment(
        payment.providerPaymentId,
      );
      const remainingMinor =
        payment.amountMinor - (providerPayment.amount_refunded ?? 0);
      if (remainingMinor > 0) {
        await this.razorpay.refundPayment(
          payment.providerPaymentId,
          remainingMinor,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        // Claim the request only if nobody changed it since we read it.
        const claimed = await tx.returnRequest.updateMany({
          where: { id, status: request.status },
          data: { status },
        });
        if (claimed.count !== 1) {
          throw new ConflictException(
            'This return request was changed by someone else. Refresh and try again.',
          );
        }
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
        await tx.order.update({
          where: { id: request.orderId },
          data: { status: 'REFUNDED' },
        });
      });

      return this.prisma.returnRequest.findUniqueOrThrow({ where: { id } });
    }

    const claimed = await this.prisma.returnRequest.updateMany({
      where: { id, status: request.status },
      data: { status },
    });
    if (claimed.count !== 1) {
      throw new ConflictException(
        'This return request was changed by someone else. Refresh and try again.',
      );
    }

    return this.prisma.returnRequest.findUniqueOrThrow({ where: { id } });
  }
}