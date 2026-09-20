import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ProductRank = { product: any; score: number };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [products, activeProducts, archivedProducts, categories, inventories, orders, pendingOrders, processingOrders, readyToShip, customRequests, pendingCustomRequests, customers, deliveryRules, settings] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'ACTIVE' } }),
        this.prisma.product.count({ where: { status: 'ARCHIVED' } }),
        this.prisma.category.count({ where: { isActive: true } }),
        this.prisma.productInventory.findMany({ where: { product: { status: 'ACTIVE' }, trackStock: true }, select: { stock: true, reserved: true, lowStockAt: true } }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
        this.prisma.order.count({ where: { status: 'PROCESSING' } }),
        this.prisma.order.count({ where: { status: 'READY_TO_SHIP' } }),
        this.prisma.customRequest.count(),
        this.prisma.customRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CUSTOMER_REVIEW'] } } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.deliveryZone.count({ where: { active: true } }),
        this.prisma.siteSetting.count(),
      ]);

    const lowStockProducts = inventories.filter((item) => item.stock - item.reserved <= item.lowStockAt).length;
    return {
      products: { total: products, active: activeProducts, archived: archivedProducts },
      categories, lowStockProducts,
      inventory: {
        availableUnits: inventories.reduce((t, i) => t + Math.max(0, i.stock - i.reserved), 0),
        reservedUnits: inventories.reduce((t, i) => t + i.reserved, 0),
      },
      orders: { total: orders, pendingPayment: pendingOrders, processing: processingOrders, readyToShip },
      customBuilds: { total: customRequests, needsAttention: pendingCustomRequests },
      customers, deliveryRules, settings,
    };
  }

  async settings() {
    const rows = await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    const featured = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', isFeatured: true },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' }, take: 20,
    });
    return { settings, featured };
  }

  async updateSettings(input: { hero?: unknown; storefront?: unknown }) {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
    if (updates.length) {
      await this.prisma.$transaction(updates.map((item) => this.prisma.siteSetting.upsert({
        where: { key: item.key }, create: { key: item.key, value: item.value }, update: { value: item.value },
      })));
    }
    return this.settings();
  }

  async deliveryZones(includeInactive = true) {
    return this.prisma.deliveryZone.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: [{ coverage: 'asc' }, { postalCode: 'asc' }] });
  }

  async upsertDeliveryZone(postalCode: string, coverage: 'DELIVERED' | 'NOT_DELIVERED', label?: string, active = true) {
    const normalized = postalCode.trim().toUpperCase();
    if (!/^[0-9A-Z -]{3,12}$/.test(normalized)) throw new BadRequestException('Invalid postal code');
    return this.prisma.deliveryZone.upsert({
      where: { postalCode: normalized },
      create: { postalCode: normalized, coverage, label: label?.trim() || null, active },
      update: { coverage, label: label?.trim() || null, active },
    });
  }

  async removeDeliveryZone(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Delivery zone not found');
    return this.prisma.deliveryZone.update({ where: { id }, data: { active: false } });
  }

  async isPostalCodeDeliverable(postalCode: string) {
    const normalized = postalCode.trim().toUpperCase();
    const exact = await this.prisma.deliveryZone.findUnique({ where: { postalCode: normalized } });
    return { postalCode: normalized, deliverable: exact ? exact.coverage === 'DELIVERED' && exact.active : true, rule: exact?.coverage ?? 'DEFAULT' };
  }

  async customers(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: { role: 'CUSTOMER', ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ] } : {}) },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true, customRequests: true, wishlist: true } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async setCustomerActive(id: string, isActive: boolean) {
    const customer = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!customer || customer.role !== 'CUSTOMER') throw new NotFoundException('Customer not found');
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, name: true, email: true, phone: true, isActive: true } });
  }

  async catalog() {
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: { category: true, prices: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 }, inventory: true, media: { orderBy: { sortOrder: 'asc' } }, metrics: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    ]);
    return { products, categories };
  }

  async merchandising(limit = 8) {
    const products = await this.prisma.product.findMany({ where: { status: 'ACTIVE' }, include: { metrics: true } });
    const bestsellers: ProductRank[] = products.map((product) => ({
      product,
      score: (product.metrics?.unitsSold ?? 0) * 8 + (product.metrics?.purchaseCount ?? 0) * 4 + (product.metrics?.cartAddCount ?? 0) + (product.metrics?.viewCount ?? 0) * 0.1,
    })).sort((a, b) => b.score - a.score);
    const newArrivals = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      algorithm: { bestseller: '8× units sold + 4× purchases + 1× cart adds + 0.1× views', newArrival: 'newest active products by createdAt' },
      bestsellers: bestsellers.slice(0, limit).map(({ product, score }) => ({ ...product, rankingScore: Number(score.toFixed(2)) })),
      newArrivals: newArrivals.slice(0, limit),
    };
  }
}
