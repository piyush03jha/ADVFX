import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.ensureOrderExists(orderId);

    const current = await this.prisma.shipment.findUnique({
      where: { orderId },
    });

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

    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.upsert({
        where: { orderId },
        create: {
          orderId,
          ...(data as any),
        },
        update: data,
      });

      if (dto.status) {
        const orderStatus = this.mapShipmentStatus(dto.status);
        if (orderStatus) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: orderStatus },
          });
        }
      }

      return shipment;
    });
  }

  private mapShipmentStatus(status: ShipmentStatus) {
    switch (status) {
      case ShipmentStatus.SHIPPED:
      case ShipmentStatus.IN_TRANSIT:
        return 'SHIPPED' as const;
      case ShipmentStatus.DELIVERED:
        return 'DELIVERED' as const;
      default:
        return null;
    }
  }

  private async ensureOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }
  }
}
