import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const [
      products,
      activeProducts,
      archivedProducts,
      categories,
      inventories,
      orders,
      pendingOrders,
      processingOrders,
      shipmentsToDispatch,
      customRequests,
      pendingCustomRequests,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.productInventory.findMany({
        where: {
          product: { status: 'ACTIVE' },
          trackStock: true,
        },
        select: { stock: true, reserved: true, lowStockAt: true },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      this.prisma.order.count({
        where: {
          status: 'READY_TO_SHIP',
        },
      }),
      this.prisma.customRequest.count(),
      this.prisma.customRequest.count({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CUSTOMER_REVIEW'] },
        },
      }),
    ]);

    const lowStockProducts = inventories.filter(
      (inventory) => inventory.stock - inventory.reserved <= inventory.lowStockAt,
    ).length;

    const reservedUnits = inventories.reduce(
      (total, inventory) => total + inventory.reserved,
      0,
    );

    const availableUnits = inventories.reduce(
      (total, inventory) =>
        total + Math.max(0, inventory.stock - inventory.reserved),
      0,
    );

    return {
      products: {
        total: products,
        active: activeProducts,
        archived: archivedProducts,
      },
      categories,
      lowStockProducts,
      inventory: {
        availableUnits,
        reservedUnits,
      },
      orders: {
        total: orders,
        pendingPayment: pendingOrders,
        processing: processingOrders,
        readyToShip: shipmentsToDispatch,
      },
      customBuilds: {
        total: customRequests,
        needsAttention: pendingCustomRequests,
      },
    };
  }
}