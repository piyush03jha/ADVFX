import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { RazorpayService } from '../payments/razorpay.service';

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

    return this.prisma.returnRequest.create({
      data: {
        orderId,
        userId,
        reason: dto.reason.trim(),
        note: dto.note?.trim() || null,
      },
    });
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
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
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

      await this.razorpay.refundPayment(
        payment.providerPaymentId,
        payment.amountMinor,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
        await tx.order.update({
          where: { id: request.orderId },
          data: { status: 'REFUNDED' },
        });
        await tx.returnRequest.update({
          where: { id },
          data: { status },
        });
      });

      return this.prisma.returnRequest.findUniqueOrThrow({ where: { id } });
    }

    return this.prisma.returnRequest.update({
      where: { id },
      data: { status },
    });
  }
}