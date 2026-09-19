import { ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: { findFirst: jest.fn() },
    productReview: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    order: { findFirst: jest.fn() },
    productMetrics: { upsert: jest.fn(), findUnique: jest.fn() },
  } as any;
  let service: ProductsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProductsService(prisma);
  });

  it('accepts a review only after a captured purchase', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.createReview('u1', 'p1', { rating: 5, comment: 'Great' } as any))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records a product view through ProductMetrics', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    const metrics = { productId: 'p1', viewCount: 1, cartAddCount: 0, purchaseCount: 0, unitsSold: 0 };
    prisma.productMetrics.upsert.mockResolvedValue(metrics);
    await expect(service.recordView('p1')).resolves.toBe(metrics);
    expect(prisma.productMetrics.upsert).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      create: { productId: 'p1', viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
  });
});
