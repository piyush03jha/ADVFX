import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  const prisma = {
    cart: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
  } as any;

  const pricing = {
    calculate: jest.fn(),
  } as any;

  let service: CheckoutService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CheckoutService(prisma, pricing);

    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      country: 'IN',
      state: 'DL',
      postalCode: '110001',
    });
  });

  it('returns a server-calculated checkout quote', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 2,
          productId: 'p1',
          product: {
            id: 'p1',
            name: 'Model',
            media: [{ type: 'IMAGE', isPrimary: true, url: '/model.jpg', sortOrder: 0 }],
          },
        },
      ],
    });
    pricing.calculate.mockResolvedValue({
      currency: 'INR',
      items: [
        { productId: 'p1', productName: 'Model', quantity: 2, unitPriceMinor: 1000, lineTotalMinor: 2000 },
      ],
      shippingRule: {
        id: 'ship-1',
        name: 'Standard',
        estimatedMinDays: 3,
        estimatedMaxDays: 7,
      },
      promotion: null,
      taxRule: null,
      summary: {
        subtotalMinor: 2000,
        shippingMinor: 150,
        discountMinor: 0,
        taxMinor: 0,
        totalMinor: 2150,
      },
    });

    const result = await service.getQuote('user-1', { shippingAddressId: 'addr-1' });

    expect(result.summary.subtotalMinor).toBe(2000);
    expect(result.summary.shippingMinor).toBe(150);
    expect(result.summary.totalMinor).toBe(2150);
    expect(result.shipping.amountMinor).toBe(150);
    expect(result.items[0].imageUrl).toBe('/model.jpg');
    expect(pricing.calculate).toHaveBeenCalledWith('user-1', {
      shippingAddressId: 'addr-1',
      couponCode: undefined,
    });
  });

  it('rejects a checkout when requested quantity exceeds available inventory', async () => {
    pricing.calculate.mockRejectedValue(
      new BadRequestException('Only 4 unit(s) of "Limited Model" are currently available'),
    );

    prisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          quantity: 6,
          productId: 'p1',
          product: {
            id: 'p1',
            name: 'Limited Model',
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
