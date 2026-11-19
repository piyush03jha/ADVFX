import { AdminBulkService } from './admin-bulk.service';

describe('AdminBulkService CSV import', () => {
  const tx = {
    product: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    productVariant: { findFirst: jest.fn(), create: jest.fn() },
    productVariantPrice: { upsert: jest.fn() },
    productPrice: { updateMany: jest.fn(), create: jest.fn() },
    productMedia: { findFirst: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    product: { findUnique: jest.fn() },
    category: { findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  } as any;
  const audit = { log: jest.fn() } as any;
  let service: AdminBulkService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Figures', slug: 'figures', parentId: null }]);
    tx.product.create.mockResolvedValue({ id: 'product-1' });
    tx.product.findUnique.mockResolvedValue({ hasSizes: true, material: null, fixedWeightGrams: null });
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

    expect(result).toEqual({ created: 1, updated: 0, categoriesCreated: 0, errors: [], notices: [] });
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

  const MAIN = { id: 'main-1', name: 'Miniature Tabletop', slug: 'miniature-tabletop', parentId: null };
  const SUB = { id: 'sub-1', name: 'Famous Characters', slug: 'famous-characters', parentId: 'main-1' };
  const csvFor = (category: string, sub = 'Famous Characters') =>
    'Name,Slug,Description,Category,Sub Category,,,Material\n' + `Shah Rukh Khan,shah-rukh-khan,"A bust, with a comma",${category},${sub},,,PLA`;

  it('creates a missing category instead of failing the row', async () => {
    prisma.category.create.mockResolvedValue({ id: 'new-cat' });
    const result = await service.importCsv('admin-1', 'name,slug,category\nTest,test,Missing');
    expect(result).toMatchObject({ created: 1, categoriesCreated: 1, errors: [] });
    expect(tx.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ categoryId: 'new-cat' }) }));
  });

  it('imports the catalog CSV shape and files the product under the existing subcategory', async () => {
    prisma.category.findMany.mockResolvedValue([MAIN, SUB]);
    const result = await service.importCsv('admin-1', csvFor('Miniature Tabletop'));
    expect(result).toEqual({ created: 1, updated: 0, categoriesCreated: 0, errors: [], notices: [] });
    expect(prisma.category.create).not.toHaveBeenCalled();
    expect(tx.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ categoryId: 'sub-1', material: 'PLA' }) }));
  });

  it.each(['Miniatures & Table Top', 'Miniature aTable Top', 'miniature table-top', 'MINIATURE TABLETOP '])(
    'reuses the existing category for the similar name "%s"', async (name) => {
      prisma.category.findMany.mockResolvedValue([MAIN, SUB]);
      const result = await service.importCsv('admin-1', csvFor(name));
      expect(prisma.category.create).not.toHaveBeenCalled();
      expect(result.categoriesCreated).toBe(0);
      expect(tx.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ categoryId: 'sub-1' }) }));
    });

  it('tells the admin when a name was matched by similarity', async () => {
    prisma.category.findMany.mockResolvedValue([MAIN, SUB]);
    const result = await service.importCsv('admin-1', csvFor('Miniature aTable Top', 'Famous Character'));
    expect(result.notices).toEqual([
      'row 2: category "Miniature aTable Top" matched existing "Miniature Tabletop"',
      'row 2: subcategory "Famous Character" matched existing "Famous Characters"',
    ]);
  });

  it('creates the subcategory under the matched main category when it is genuinely new', async () => {
    prisma.category.findMany.mockResolvedValue([MAIN]);
    prisma.category.create.mockResolvedValue({ id: 'sub-new' });
    const result = await service.importCsv('admin-1', csvFor('Miniatures & Table Top', 'Sports Stars'));
    expect(result.categoriesCreated).toBe(1);
    expect(prisma.category.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Sports Stars', slug: 'sports-stars', parentId: 'main-1' }),
    }));
  });

  it('does not merge genuinely different categories, and reuses a category created earlier in the same file', async () => {
    prisma.category.findMany.mockResolvedValue([MAIN]);
    prisma.category.create.mockResolvedValue({ id: 'new-1' });
    const result = await service.importCsv('admin-1',
      'name,slug,category\nA,a,Board Games\nB,b,Board Games\nC,c,Miniature Vehicles');
    expect(result.created).toBe(3);
    expect(prisma.category.create).toHaveBeenCalledTimes(2);
  });
});
