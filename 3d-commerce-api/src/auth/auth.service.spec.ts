import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const service = new AuthService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_AUTH_SECRET = 'test-secret';
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
  });
});
