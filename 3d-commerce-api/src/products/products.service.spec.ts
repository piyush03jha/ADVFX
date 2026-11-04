import { ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const storage = { saveProductFile: jest.fn(), delete: jest.fn(), getAbsolutePath: jest.fn() } as any;
  const prisma = {
    product: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    category: { findMany: jest.fn() },
    siteSetting: { findUnique: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    productReview: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
    order: { findFirst: jest.fn() },
    productMetrics: { upsert: jest.fn(), findUnique: jest.fn() },
    productViewEvent: { createMany: jest.fn(), deleteMany: jest.fn() },
  } as any;
  let service: ProductsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.productViewEvent.deleteMany.mockResolvedValue({ count: 0 });
    process.env.PRODUCT_VIEW_DEDUPE_ENABLED = 'true';
    service = new ProductsService(prisma, storage);
  });

  it('filters and sorts the shop by active variant prices, not the legacy product price', async () => {
    const variantProduct = (id: string, createdAt: string, amounts: number[]) => ({
      id,
      createdAt: new Date(createdAt),
      prices: [],
      variants: amounts.map((amountMinor) => ({ price: { amountMinor, currency: 'INR', isActive: true } })),
    });
    prisma.siteSetting.findUnique.mockResolvedValue(null);
    prisma.productReview.groupBy.mockResolvedValue([]);
    prisma.product.findMany
      .mockResolvedValueOnce([
        variantProduct('cheap', '2026-01-01', [90000, 120000]),
        variantProduct('mid', '2026-01-02', [250000]),
        variantProduct('pricey', '2026-01-03', [900000]),
        { id: 'unpriced', createdAt: new Date('2026-01-04'), prices: [], variants: [{ price: { amountMinor: 0, currency: 'INR', isActive: false } }] },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.findShopPage({
      page: 1, limit: 12, minPrice: 1000, maxPrice: 5000, sort: 'price-high',
    });

    // 'cheap' falls below the 1,000 minimum (its cheapest size is 900) and
    // unpriced products never match an active price filter.
    expect(result.total).toBe(1);
    const idQuery = prisma.product.findMany.mock.calls[1][0];
    expect(idQuery.where).toEqual({ id: { in: ['mid'] } });
    // Variant prices are only loaded for the page that is returned.
    expect(idQuery.include.variants.take).toBeUndefined();
  });

  it('accepts a review only after a captured purchase', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.createReview('u1', 'p1', { rating: 5, comment: 'Great' } as any))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not show latest reviews of archived or draft products', async () => {
    prisma.productReview.findMany.mockResolvedValue([]);

    await service.getLatestReviews(6);

    expect(prisma.productReview.findMany.mock.calls[0][0].where).toEqual({
      isPublished: true,
      product: { status: 'ACTIVE' },
    });
  });

  it('increments product views only once per visitor and UTC day', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.productViewEvent.createMany.mockResolvedValue({ count: 1 });
    const metrics = { productId: 'p1', viewCount: 1, cartAddCount: 0, purchaseCount: 0, unitsSold: 0 };
    prisma.productMetrics.upsert.mockResolvedValue(metrics);

    await expect(service.recordView('p1', '127.0.0.1|test-agent')).resolves.toBe(metrics);

    expect(prisma.productViewEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        productId: 'p1',
        visitorHash: expect.any(String),
        bucketStart: expect.any(Date),
      })],
      skipDuplicates: true,
    });
    expect(prisma.productMetrics.upsert).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      create: { productId: 'p1', viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
  });

  it('does not increment metrics for a duplicate product view event', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.productViewEvent.createMany.mockResolvedValue({ count: 0 });
    const metrics = { productId: 'p1', viewCount: 4, cartAddCount: 0, purchaseCount: 0, unitsSold: 0 };
    prisma.productMetrics.findUnique.mockResolvedValue(metrics);

    await expect(service.recordView('p1', '127.0.0.1|test-agent')).resolves.toBe(metrics);

    expect(prisma.productMetrics.upsert).not.toHaveBeenCalled();
    expect(prisma.productMetrics.findUnique).toHaveBeenCalledWith({ where: { productId: 'p1' } });
  });
});
