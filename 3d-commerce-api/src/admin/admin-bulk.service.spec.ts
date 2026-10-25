import { AdminBulkService } from './admin-bulk.service';

describe('AdminBulkService CSV import', () => {
  const tx = {
    product: { create: jest.fn(), update: jest.fn() },
    productVariant: { findFirst: jest.fn(), create: jest.fn() },
    productVariantPrice: { upsert: jest.fn() },
    productPrice: { updateMany: jest.fn(), create: jest.fn() },
    productInventory: { upsert: jest.fn() },
    productMedia: { findFirst: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    product: { findUnique: jest.fn() },
    category: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  } as any;
  const audit = { log: jest.fn() } as any;
  let service: AdminBulkService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
    tx.product.create.mockResolvedValue({ id: 'product-1' });
    tx.productVariant.findFirst.mockResolvedValue(null);
    tx.productVariant.create.mockResolvedValue({});
    tx.productPrice.updateMany.mockResolvedValue({ count: 0 });
    tx.productPrice.create.mockResolvedValue({});
    tx.productMedia.findFirst.mockResolvedValue(null);
    service = new AdminBulkService(prisma, audit);
  });

  it('creates a complete product with description, category, three priced variants and a product price', async () => {
    const result = await service.importCsv('admin-1',
      'name,slug,description,category,price,smallprice,mediumprice,largeprice\n' +
      'Test Figure,test-figure,"A detailed, hand-painted figure",Figures,199,99,199,299');

    expect(result).toEqual({ created: 1, updated: 0, errors: [] });
    expect(tx.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Test Figure',
        slug: 'test-figure',
        description: 'A detailed, hand-painted figure',
        categoryId: 'cat-1',
        status: 'ACTIVE',
      }),
    }));
    expect(tx.productVariant.create).toHaveBeenCalledTimes(3);
    expect(tx.productVariant.create.mock.calls.map((call: any[]) => call[0].data.price.create.amountMinor))
      .toEqual([9900, 19900, 29900]);
    expect(tx.productPrice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ productId: 'product-1', amountMinor: 19900, currency: 'INR' }),
    }));
  });

  it('backfills missing variants for products that were imported before the fix', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'legacy-product' });
    tx.productVariant.findFirst.mockResolvedValue(null);

    const result = await service.importCsv('admin-1', 'name,slug,description\nLegacy,legacy-product,"Existing description"');

    expect(result.updated).toBe(1);
    expect(tx.productVariant.create).toHaveBeenCalledTimes(3);
    expect(tx.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'legacy-product' },
      data: expect.objectContaining({ description: 'Existing description' }),
    }));
  });

  it('reports unknown categories without creating a partial product', async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    const result = await service.importCsv('admin-1', 'name,slug,category\nTest,test,Missing');
    expect(result.created).toBe(0);
    expect(result.errors[0]).toContain('category "Missing" was not found');
    expect(tx.product.create).not.toHaveBeenCalled();
  });
});
