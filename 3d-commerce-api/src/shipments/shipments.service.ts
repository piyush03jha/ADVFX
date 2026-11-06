import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { guardShipmentUpdate } from '../orders/shipment-guard';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findOne(orderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async update(orderId: string, dto: UpdateShipmentDto) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Serialize with order status changes and refunds, then validate
        // against the order's current state rather than a stale read.
        const locked = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`,
        );
        if (locked.length === 0) {
          throw new BadRequestException('Order not found');
        }

        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true, userId: true, orderNumber: true },
        });

        // A shipment update may ship or deliver an order, but only a
        // confirmed (paid) one, and never revive a cancelled/refunded order.
        const decision = guardShipmentUpdate(order.status, dto.status);
        if (decision.action === 'REJECT') {
          throw new BadRequestException(decision.message);
        }

        const current = await tx.shipment.findUnique({ where: { orderId } });

        const data = {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.carrier !== undefined ? { carrier: dto.carrier } : {}),
          ...(dto.trackingNumber !== undefined ? { trackingNumber: dto.trackingNumber } : {}),
          ...(dto.trackingUrl !== undefined ? { trackingUrl: dto.trackingUrl } : {}),
          ...(dto.status === ShipmentStatus.SHIPPED && !current?.shippedAt
            ? { shippedAt: new Date() }
            : {}),
          ...(dto.status === ShipmentStatus.DELIVERED && !current?.deliveredAt
            ? { deliveredAt: new Date() }
            : {}),
        };

        const shipment = await tx.shipment.upsert({
          where: { orderId },
          create: {
            orderId,
            ...(data as any),
          },
          update: data,
        });

        if (decision.action === 'ADVANCE') {
          await tx.order.update({
            where: { id: orderId },
            data: { status: decision.to },
          });
        }

        return {
          shipment,
          advancedTo: decision.action === 'ADVANCE' ? decision.to : null,
          userId: order.userId,
          orderNumber: order.orderNumber,
        };
      },
      { timeout: 15_000, maxWait: 5_000 },
    );

    // Tell the customer when the order actually moves (shipped / delivered),
    // the same way a status change from the order screen does.
    if (result.advancedTo && result.userId) {
      const shipped = result.advancedTo === 'SHIPPED';
      const tracking = [result.shipment.carrier, result.shipment.trackingNumber]
        .filter(Boolean)
        .join(' ');
      await this.notifications.create(result.userId, {
        type: shipped ? NotificationType.ORDER_SHIPPED : NotificationType.ORDER_DELIVERED,
        title: shipped ? 'Order shipped' : 'Order delivered',
        message:
          `Order ${result.orderNumber} is now ${shipped ? 'shipped' : 'delivered'}.` +
          (shipped && tracking ? ` Tracking: ${tracking}.` : ''),
        entityType: 'ORDER',
        entityId: orderId,
      });
    }

    return result.shipment;
  }
}
