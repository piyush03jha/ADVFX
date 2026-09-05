import { CheckoutService } from './checkout.service';
import { BadRequestException } from '@nestjs/common';

describe('CheckoutService', () => {
  const prisma = {
    cart: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
  } as any;

  const shipping = {
    quote: jest.fn(),
  } as any;

  let service: CheckoutService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CheckoutService(prisma, shipping);
    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      country: 'IN',
      state: 'DL',
      postalCode: '110001',
    });
    shipping.quote.mockResolvedValue({
      amountMinor: 150,
      ruleId: 'ship-1',
      estimatedMinDays: 3,
      estimatedMaxDays: 7,
    });
  });

  it('returns a server-calculated checkout quote', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 2,
          product: {
            id: 'p1',
            name: 'Model',
            status: 'ACTIVE',
            weight: '1kg',
            inventory: { stock: 5, reserved: 1, trackStock: true, allowBackorder: false },
            prices: [{ amountMinor: 1000, currency: 'INR' }],
            media: [],
          },
        },
      ],
    });

    const result = await service.getQuote('user-1', { shippingAddressId: 'addr-1' });

    expect(result.summary.subtotalMinor).toBe(2000);
    expect(result.summary.shippingMinor).toBe(150);
    expect(result.summary.totalMinor).toBe(2150);
    expect(result.shipping.amountMinor).toBe(150);
  });

  it('rejects a checkout when requested quantity exceeds available inventory', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 6,
          product: {
            id: 'p1',
            name: 'Limited Model',
            status: 'ACTIVE',
            weight: '500g',
            inventory: { stock: 5, reserved: 1, trackStock: true, allowBackorder: false },
            prices: [{ amountMinor: 1000, currency: 'INR' }],
            media: [],
          },
        },
      ],
    });

    await expect(
      service.getQuote('user-1', { shippingAddressId: 'addr-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
