import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  } as any;

  const emailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  } as any;

  const captchaService = { verify: jest.fn() } as any;
  const service = new AuthService(prisma, emailService, captchaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid admin credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('admin@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an admin without a credential record', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
      adminFailedLoginCount: 0,
      adminLockedUntil: null,
    });
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      service.login('admin@example.com', 'test-secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
