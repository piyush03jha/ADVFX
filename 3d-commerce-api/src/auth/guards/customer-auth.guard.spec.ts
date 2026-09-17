import { UnauthorizedException } from '@nestjs/common';

import { CustomerAuthGuard } from './customer-auth.guard';

function contextFor(authorization?: string) {
  const request = { headers: { authorization } } as any;
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
  };
}

describe('CustomerAuthGuard', () => {
  const authService = {
    authenticateCustomer: jest.fn(),
  } as any;
  const guard = new CustomerAuthGuard(authService);

  beforeEach(() => jest.clearAllMocks());

  it('accepts a customer Bearer session and attaches the customer', async () => {
    const user = { id: 'customer-1', email: 'customer@example.com', name: null, role: 'CUSTOMER' };
    authService.authenticateCustomer.mockResolvedValue(user);
    const { context, request } = contextFor('Bearer customer-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.authenticateCustomer).toHaveBeenCalledWith('customer-token');
    expect(request.user).toEqual(user);
  });

  it('rejects a missing or malformed Bearer session before lookup', async () => {
    await expect(guard.canActivate(contextFor().context)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(contextFor('Basic token').context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.authenticateCustomer).not.toHaveBeenCalled();
  });
});
