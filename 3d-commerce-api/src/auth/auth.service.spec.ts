import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = { user: { findUnique: jest.fn(), update: jest.fn() }, $executeRaw: jest.fn(), $queryRaw: jest.fn(), $transaction: jest.fn() } as any;
  const emailService = { sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() } as any;
  const captchaService = { verify: jest.fn() } as any;
  const service = new AuthService(prisma, emailService, captchaService);

  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid admin credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('admin@example.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an admin without a credential record', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', isActive: true, adminFailedLoginCount: 0, adminLockedUntil: null });
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(service.login('admin@example.com', 'test-secret')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resets a customer password with a valid reset token', async () => {
    const token = 'a'.repeat(43);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'reset-1', userId: 'customer-1', tokenHash }]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

    await expect(service.resetCustomerPassword(token, 'new-password-123')).resolves.toEqual({ message: 'Password reset successfully.' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('rejects a missing, expired, or already-used reset token', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.resetCustomerPassword('a'.repeat(43), 'new-password-123')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
