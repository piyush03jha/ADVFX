import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AuthCaptchaService } from './captcha.service';

describe('AuthCaptchaService', () => {
  const originalFetch = global.fetch;
  let service: AuthCaptchaService;
  const prisma = {
    authCaptchaNonce: { createMany: jest.fn(), deleteMany: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.authCaptchaNonce.createMany.mockResolvedValue({ count: 1 });
    prisma.authCaptchaNonce.deleteMany.mockResolvedValue({ count: 0 });
    service = new AuthCaptchaService(prisma);
    process.env.AUTH_CAPTCHA_SECRET = 'test-captcha-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    delete process.env.AUTH_CAPTCHA_PROVIDER;
    delete process.env.TURNSTILE_SECRET;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_HOSTNAMES;
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ORIGINS;
  });

  it('accepts a correct math answer and matching purpose', () => {
    const challenge = service.issue('login');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    await expect(service.verify(challenge.token, String(answer), 'login')).resolves.toBeUndefined();
  });

  it('rejects incorrect answers, purpose changes, and replay', async () => {
    const challenge = service.issue('register');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    await expect(service.verify(challenge.token, '99', 'register')).rejects.toThrow(BadRequestException);
    await expect(service.verify(challenge.token, String(answer), 'login')).rejects.toThrow(BadRequestException);
    prisma.authCaptchaNonce.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(service.verify(challenge.token, String(answer), 'register')).resolves.toBeUndefined();
    await expect(service.verify(challenge.token, String(answer), 'register')).rejects.toThrow(BadRequestException);
  });

  it('issues a Turnstile challenge when configured', () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'turnstile';
    process.env.TURNSTILE_SITE_KEY = 'test-site-key';
    expect(service.issue('login')).toEqual({ provider: 'turnstile', siteKey: 'test-site-key' });
  });

  it('calls Cloudflare Siteverify and validates action plus hostname', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'turnstile';
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    process.env.TURNSTILE_HOSTNAMES = 'voxel3d.org,localhost';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, action: 'login', hostname: 'voxel3d.org' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(service.verifyForAuth('turnstile-token', undefined, 'login')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"response":"turnstile-token"'),
      }),
    );
  });

  it('rejects failed Cloudflare validation, mismatched action, and hostname', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'turnstile';
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    process.env.TURNSTILE_HOSTNAMES = 'voxel3d.org';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    }) as unknown as typeof fetch;
    await expect(service.verifyForAuth('expired', undefined, 'login')).rejects.toThrow(BadRequestException);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, action: 'register', hostname: 'voxel3d.org' }),
    }) as unknown as typeof fetch;
    await expect(service.verifyForAuth('wrong-action', undefined, 'login')).rejects.toThrow(BadRequestException);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, action: 'login', hostname: 'attacker.example' }),
    }) as unknown as typeof fetch;
    await expect(service.verifyForAuth('wrong-host', undefined, 'login')).rejects.toThrow(BadRequestException);
  });

  it('fails closed when Cloudflare is unavailable or the secret is absent', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'turnstile';
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(service.verifyForAuth('token', undefined, 'login')).rejects.toThrow(ServiceUnavailableException);
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(service.verifyForAuth('token', undefined, 'login')).rejects.toThrow(ServiceUnavailableException);
  });

  it('uses a shared database insert to reject CAPTCHA replays across replicas', async () => {
    const challenge = service.issue('login');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;

    prisma.authCaptchaNonce.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(service.verify(challenge.token, String(answer), 'login')).resolves.toBeUndefined();
    await expect(service.verify(challenge.token, String(answer), 'login')).rejects.toThrow(BadRequestException);

    expect(prisma.authCaptchaNonce.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        nonce: expect.any(String),
        expiresAt: expect.any(Date),
      })],
      skipDuplicates: true,
    });
  });

  it('fails closed when the shared replay store is unavailable', async () => {
    const challenge = service.issue('login');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    prisma.authCaptchaNonce.createMany.mockRejectedValue(new Error('database unavailable'));

    await expect(service.verify(challenge.token, String(answer), 'login')).rejects.toThrow(ServiceUnavailableException);
  });

});
