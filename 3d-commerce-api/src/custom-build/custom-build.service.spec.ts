import { BadRequestException } from '@nestjs/common';
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
  } as any;
  const notifications = { create: jest.fn() } as any;
  let service: CustomBuildService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CustomBuildService(prisma, notifications);
  });

  it('creates a custom request with server-owned reference count', async () => {
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
});
