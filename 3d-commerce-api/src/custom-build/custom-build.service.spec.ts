import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomBuildService } from './custom-build.service';

describe('CustomBuildService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    customRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    customRequestQuote: { upsert: jest.fn() },
    customBuildCategory: { findUnique: jest.fn() },
    customBuildHeightRange: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    address: { findFirst: jest.fn() },
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
  const notifications = { create: jest.fn() } as any;
  const storage = {} as any;
  let service: CustomBuildService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CustomBuildService(prisma, notifications, storage);
  });

  it('creates a custom request with server-owned reference count', async () => {
    jest.spyOn(service as any, 'calculateConfiguredPrice').mockResolvedValue({
      amountMinor: 59900,
      currency: 'INR',
      breakdown: [],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const request = { id: 'r1', userId: 'u1', title: 'Custom Person', media: [], quote: null };
    prisma.customRequest.create.mockResolvedValue(request);
    prisma.customRequestQuote.upsert.mockResolvedValue({});
    prisma.customRequest.findUniqueOrThrow.mockResolvedValue(request);
    notifications.create.mockResolvedValue(undefined);

    await expect(service.create('u1', {
      title: ' Custom Person ',
      requirements: '  Person, full body  ',
      dimensions: '15 cm',
      category: 'person',
      bodyType: 'full',
      headType: 'stationary',
      subjectType: 'single',
      sizeCm: 15,
    })).resolves.toBe(request);

    expect(prisma.customRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceFileCount: 0, status: 'SUBMITTED' }),
    }));
  });

  it('allows only the physical-production workflow transitions', async () => {
    prisma.customRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'UNDER_REVIEW' });
    prisma.customRequest.update.mockResolvedValue({ id: 'r1', status: 'IN_PRODUCTION', userId: 'u1' });

    await expect(service.updateStatus('r1', 'IN_PRODUCTION' as any)).resolves.toBeDefined();

    prisma.customRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'UNDER_REVIEW' });
    await expect(service.updateStatus('r1', 'CUSTOMER_REVIEW' as any)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('stores the configured price as integer paise (no float round-trip)', async () => {
    // 1999 paise: (1999 / 100) * 100 === 1998.9999999999998 in JS floating point.
    jest.spyOn(service as any, 'calculateConfiguredPrice').mockResolvedValue({
      amountMinor: 1999,
      currency: 'INR',
      breakdown: [],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const request = { id: 'r1', userId: 'u1', title: 'Custom Person', media: [], quote: null };
    prisma.customRequest.create.mockResolvedValue(request);
    prisma.customRequestQuote.upsert.mockResolvedValue({});
    prisma.customRequest.findUniqueOrThrow.mockResolvedValue(request);
    notifications.create.mockResolvedValue(undefined);

    await service.create('u1', {
      title: 'Custom Person',
      requirements: 'Person, full body',
      category: 'person',
      sizeCm: 15,
    } as any);

    const data = prisma.customRequest.create.mock.calls[0][0].data;
    expect(data.priceMinor).toBe(1999);
    expect(Number.isInteger(data.priceMinor)).toBe(true);
    expect(prisma.customRequestQuote.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ amountMinor: 1999 }),
      update: expect.objectContaining({ amountMinor: 1999 }),
    }));
  });

  describe('height range pricing', () => {
    const ranges = [
      { id: 'h1', minCm: 8, maxCm: 12, priceMinor: 150000 },
      { id: 'h2', minCm: 12.1, maxCm: 20, priceMinor: 250000 },
    ];
    const category = (slug: string) => ({
      id: 'c1',
      slug,
      name: slug,
      isActive: true,
      currency: 'INR',
      options: [
        { section: 'body', slug: 'full', name: 'Full', priceMinor: 100000 },
        { section: 'frame', slug: 'couple', name: 'Couple', priceMinor: 50000 },
      ],
      heightRanges: ranges,
    });

    it('charges the admin range price for any height inside the range', async () => {
      prisma.customBuildCategory.findUnique.mockResolvedValue(category('object'));
      for (const sizeCm of [8, 10, 12]) {
        await expect(service.quote({ category: 'object', sizeCm })).resolves.toEqual(
          expect.objectContaining({ amountMinor: 150000 }),
        );
      }
      await expect(service.quote({ category: 'object', sizeCm: 12.1 })).resolves.toEqual(
        expect.objectContaining({ amountMinor: 250000 }),
      );
    });

    it('adds the admin body and frame prices on top of the range price for person builds', async () => {
      prisma.customBuildCategory.findUnique.mockResolvedValue(category('person'));
      await expect(
        service.quote({ category: 'person', bodyType: 'full', subjectType: 'couple', sizeCm: 10 }),
      ).resolves.toEqual(expect.objectContaining({ amountMinor: 150000 + 100000 + 50000 }));
    });

    it('rejects a height that no admin range covers', async () => {
      prisma.customBuildCategory.findUnique.mockResolvedValue(category('object'));
      await expect(service.quote({ category: 'object', sizeCm: 30 })).rejects.toThrow(/No price is configured/);
      await expect(service.quote({ category: 'object', sizeCm: 7.9 })).rejects.toThrow(/8–12 cm/);
    });

    it('refuses to save an overlapping active range', async () => {
      prisma.customBuildHeightRange.findFirst.mockResolvedValue({ minCm: 8, maxCm: 12 });
      await expect(service.updateConfigHeightRange('h2', { minCm: 11 })).rejects.toBeDefined();
      prisma.customBuildHeightRange.findUnique.mockResolvedValue({ id: 'h2', categoryId: 'c1', minCm: 12.1, maxCm: 20, isActive: true });
      await expect(service.updateConfigHeightRange('h2', { minCm: 11 })).rejects.toThrow(/Overlaps/);
      await expect(service.updateConfigHeightRange('h2', { minCm: 25 })).rejects.toThrow(/Minimum height/);
    });
  });

  describe('checkout', () => {
    const baseRequest = {
      id: 'r1',
      userId: 'u1',
      category: 'person',
      sizeCm: 15,
      priceMinor: 59900,
      priceCurrency: 'INR',
      status: 'SUBMITTED',
      orderId: null as string | null,
    };
    const address = { id: 'a2', userId: 'u1' };

    beforeEach(() => {
      prisma.address.findFirst.mockResolvedValue(address);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockResolvedValue({ id: 'o-new', status: 'PENDING_PAYMENT' });
      prisma.customRequestQuote.upsert.mockResolvedValue({});
    });

    it('refuses to start a second payment once the request is in production', async () => {
      prisma.customRequest.findFirst.mockResolvedValue({ ...baseRequest, status: 'IN_PRODUCTION', orderId: 'o1' });

      await expect(service.checkout('u1', 'r1', 'a2', 'key-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('reuses the unpaid order instead of creating a duplicate', async () => {
      const pending = { id: 'o1', status: 'PENDING_PAYMENT', shippingAddressId: 'a2' };
      prisma.customRequest.findFirst.mockResolvedValue({ ...baseRequest, orderId: 'o1' });
      prisma.order.findUnique.mockResolvedValue(pending);

      await expect(service.checkout('u1', 'r1', 'a2', 'key-2')).resolves.toEqual({
        requestId: 'r1',
        order: pending,
      });
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('moves a reused unpaid order to the shipping address chosen on retry', async () => {
      prisma.customRequest.findFirst.mockResolvedValue({ ...baseRequest, orderId: 'o1' });
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'PENDING_PAYMENT', shippingAddressId: 'a1' });
      const updated = { id: 'o1', status: 'PENDING_PAYMENT', shippingAddressId: 'a2' };
      prisma.order.update.mockResolvedValue(updated);

      await expect(service.checkout('u1', 'r1', 'a2', 'key-3')).resolves.toEqual({
        requestId: 'r1',
        order: updated,
      });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'o1' },
        data: expect.objectContaining({
          shippingAddressId: 'a2',
          shippingAddressSnapshot: expect.objectContaining({ postalCode: undefined }),
        }),
      }));
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('creates a fresh order when the previous unpaid order was cancelled', async () => {
      prisma.customRequest.findFirst.mockResolvedValue({ ...baseRequest, orderId: 'o1' });
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'CANCELLED', shippingAddressId: 'a1' });

      await expect(service.checkout('u1', 'r1', 'a2', 'key-4')).resolves.toEqual(
        expect.objectContaining({ requestId: 'r1', order: { id: 'o-new', status: 'PENDING_PAYMENT' } }),
      );
      expect(prisma.order.create).toHaveBeenCalledTimes(1);
    });

    it('refuses checkout when the linked order is already paid', async () => {
      prisma.customRequest.findFirst.mockResolvedValue({ ...baseRequest, orderId: 'o1' });
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'CONFIRMED', shippingAddressId: 'a1' });

      await expect(service.checkout('u1', 'r1', 'a2', 'key-5')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });
});
