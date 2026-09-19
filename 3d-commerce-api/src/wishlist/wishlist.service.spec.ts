import { NotFoundException } from '@nestjs/common';

import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  const prisma = {
    wishlist: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    wishlistItem: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
  } as any;

  let service: WishlistService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WishlistService(prisma);
  });

  it('returns an empty wishlist when the user has no wishlist', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(null);

    await expect(service.getWishlist('u1')).resolves.toEqual({
      id: null,
      items: [],
    });
  });

  it('rejects unavailable products', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(service.addItem('u1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.wishlist.upsert).not.toHaveBeenCalled();
  });

  it('adds an item idempotently and returns the updated wishlist', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.wishlist.upsert.mockResolvedValue({ id: 'w1' });
    prisma.wishlistItem.upsert.mockResolvedValue({ id: 'wi1' });
    prisma.wishlist.findUnique.mockResolvedValue({
      id: 'w1',
      items: [
        {
          id: 'wi1',
          createdAt: new Date('2026-09-19T10:00:00.000Z'),
          product: { id: 'p1', name: 'Product' },
        },
      ],
    });

    await expect(service.addItem('u1', ' p1 ')).resolves.toMatchObject({
      id: 'w1',
      items: [{ id: 'wi1', product: { id: 'p1' } }],
    });

    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith({
      where: { wishlistId_productId: { wishlistId: 'w1', productId: 'p1' } },
      create: { wishlistId: 'w1', productId: 'p1' },
      update: {},
    });
  });

  it('removes only the current user\'s product', async () => {
    prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
    prisma.wishlist.findUnique.mockResolvedValue({ id: 'w1', items: [] });

    await expect(service.removeItem('u1', 'p1')).resolves.toEqual({ id: 'w1', items: [] });
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'p1', wishlist: { userId: 'u1' } },
    });
  });
});
