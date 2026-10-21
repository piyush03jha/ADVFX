import { CategoriesService } from './categories.service';

describe('CategoriesService product counts', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;
  const storage = {} as any;
  let service: CategoriesService;

  const countWhere = (call: any[]) => call[0].include._count.select.products.where;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.category.count.mockResolvedValue(0);
    service = new CategoriesService(prisma, storage);
  });

  it('counts only ACTIVE products for the storefront list', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await service.findAll(false);

    expect(countWhere(prisma.category.findMany.mock.calls[0])).toEqual({ status: 'ACTIVE' });
  });

  it('counts every non-archived product for the admin list', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await service.findAll(true);

    expect(countWhere(prisma.category.findMany.mock.calls[0])).toEqual({
      status: { not: 'ARCHIVED' },
    });
  });

  it('does not report archived (deleted) products as models in a category', async () => {
    // The database does the filtering; make sure the count we hand back is the filtered one.
    prisma.category.findMany.mockResolvedValue([
      { id: 'c1', name: 'Toys', imageUrl: null, _count: { products: 0 } },
    ]);

    const [category] = await service.findAll(false);

    expect(category._count.products).toBe(0);
    expect(countWhere(prisma.category.findMany.mock.calls[0])).toEqual({ status: 'ACTIVE' });
  });

  it('deactivates instead of deleting a category that still holds live products', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', imageUrl: null, _count: { products: 2 } });
    prisma.category.update.mockResolvedValue({ id: 'c1', isActive: false });

    await service.remove('c1');

    expect(prisma.category.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { isActive: false } });
    expect(prisma.category.delete).not.toHaveBeenCalled();
    expect(countWhere(prisma.category.findUnique.mock.calls[0])).toEqual({ status: { not: 'ARCHIVED' } });
  });

  it('deletes a category that has no live products', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', imageUrl: null, _count: { products: 0 } });
    prisma.category.delete.mockResolvedValue({});

    await expect(service.remove('c1')).resolves.toEqual({ message: 'Category deleted successfully' });
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
