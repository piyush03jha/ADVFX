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
    user: { findUnique: jest.fn(), update: jest.fn() },
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
    await expect(service.login('admin@example.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('creates a session for an active admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    });

    const result = await service.login('admin@example.com', 'test-secret');
    expect(result.token).toBeTruthy();
    expect(result.user.role).toBe('ADMIN');
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });
});
