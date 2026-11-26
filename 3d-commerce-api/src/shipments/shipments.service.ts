import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { guardShipmentUpdate } from '../orders/shipment-guard';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { collectCod } from '../orders/cod';
import { queueWhatsAppOrder } from '../notifications/whatsapp-order';

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
    if (dto.trackingUrl !== undefined) {
      try {
        const url = new URL(dto.trackingUrl);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe URL');
      } catch {
        throw new BadRequestException('Tracking URL must be a valid HTTPS URL without credentials');
      }
    }
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Serialize with order status changes and refunds, then validate
        // against the order's current state rather than a stale read.
        // Lock payment before order for delivery, matching payment/refund lock order.
        if (dto.status === ShipmentStatus.DELIVERED) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Payment" WHERE "orderId" = ${orderId} FOR UPDATE`);
        const locked = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`,
        );
        if (locked.length === 0) {
          throw new BadRequestException('Order not found');
        }

        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { id: true, status: true, userId: true, orderNumber: true, totalMinor: true, currency: true, whatsappPhone: true, whatsappOptedInAt: true, payment: { select: { provider: true } } },
        });

        // A shipment update may ship or deliver an order, but only a
        // confirmed (paid) one, and never revive a cancelled/refunded order.
        const decision = guardShipmentUpdate(order.status, dto.status);
        if (decision.action === 'REJECT') {
          throw new BadRequestException(decision.message);
        }

        const current = await tx.shipment.findUnique({ where: { orderId } });
        if (dto.status === ShipmentStatus.DELIVERED && order.payment?.provider === 'COD' && order.status !== 'DELIVERED') await collectCod(tx, orderId, dto.codCollected === true);

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

        const newStatus = decision.action === 'ADVANCE' ? decision.to : order.status;
        if (newStatus === 'SHIPPED') await queueWhatsAppOrder(tx, order, 'SHIPPED', { carrier: shipment.carrier, trackingNumber: shipment.trackingNumber });
        if (decision.action === 'ADVANCE' && newStatus === 'DELIVERED') await queueWhatsAppOrder(tx, order, 'DELIVERED');
        return {
          shipment,
          advancedTo: decision.action === 'ADVANCE' ? decision.to : null,
          userId: order.userId,
          orderNumber: order.orderNumber,
          trackingChanged: Boolean(shipment.trackingNumber && (shipment.trackingNumber !== current?.trackingNumber || shipment.carrier !== current?.carrier)),
          orderWasShipped: order.status === "SHIPPED",
        };
      },
      { timeout: 15_000, maxWait: 5_000 },
    );

    // Tell the customer when the order actually moves (shipped / delivered),
    // the same way a status change from the order screen does.
    const trackingUpdated = !result.advancedTo && result.orderWasShipped && result.trackingChanged;
    if ((result.advancedTo || trackingUpdated) && result.userId) {
      const shipped = result.advancedTo === 'SHIPPED' || trackingUpdated;
      const tracking = [result.shipment.carrier, result.shipment.trackingNumber]
        .filter(Boolean)
        .join(' ');
      await this.notifications.create(result.userId, {
        type: shipped ? NotificationType.ORDER_SHIPPED : NotificationType.ORDER_DELIVERED,
        title: trackingUpdated ? 'Shipment tracking updated' : shipped ? 'Order shipped' : 'Order delivered',
        message:
          (trackingUpdated ? `Tracking details for order ${result.orderNumber} have been updated.` : `Order ${result.orderNumber} is now ${shipped ? 'shipped' : 'delivered'}.`) +
          (shipped && tracking ? ` Tracking: ${tracking}. View My Orders to track your parcel on the courier website.` : ''),
        entityType: 'ORDER',
        entityId: orderId,
      });
    }

    return result.shipment;
  }
}
