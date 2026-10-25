import { ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const storage = { saveProductFile: jest.fn(), delete: jest.fn(), getAbsolutePath: jest.fn() } as any;
  const prisma = {
    product: { findFirst: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    productReview: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
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

  it('upserts country-specific variant pricing without overwriting its global price', async () => {
    prisma.productVariant.findFirst.mockResolvedValue({ id: 'v1' });
    const price = {
      id: 'price-in-v1', variantId: 'v1', countryCode: 'IN',
      currency: 'INR', amountMinor: 15000, compareAtMinor: 17000, isActive: true,
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'v1' }]),
      productVariantCountryPrice: { upsert: jest.fn().mockResolvedValue(price) },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await expect(service.setVariantCountryPrice('p1', 'v1', {
      countryCode: 'in',
      currency: 'inr',
      amountMinor: 15000,
      compareAtMinor: 17000,
    })).resolves.toBe(price);

    expect(tx.productVariantCountryPrice.upsert).toHaveBeenCalledWith({
      where: { variantId_countryCode: { variantId: 'v1', countryCode: 'IN' } },
      create: {
        variantId: 'v1', countryCode: 'IN', currency: 'INR',
        amountMinor: 15000, compareAtMinor: 17000, isActive: true,
      },
      update: {
        currency: 'INR', amountMinor: 15000,
        compareAtMinor: 17000, isActive: true,
      },
    });
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
