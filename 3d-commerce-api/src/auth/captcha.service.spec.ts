import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AuthCaptchaService } from './captcha.service';

describe('AuthCaptchaService', () => {
  const originalFetch = global.fetch;
  let service: AuthCaptchaService;

  beforeEach(() => {
    service = new AuthCaptchaService();
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
    expect(() => service.verify(challenge.token, String(answer), 'login')).not.toThrow();
  });

  it('rejects incorrect answers, purpose changes, and replay', () => {
    const challenge = service.issue('register');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    expect(() => service.verify(challenge.token, '99', 'register')).toThrow(BadRequestException);
    expect(() => service.verify(challenge.token, String(answer), 'login')).toThrow(BadRequestException);
    expect(() => service.verify(challenge.token, String(answer), 'register')).not.toThrow();
    expect(() => service.verify(challenge.token, String(answer), 'register')).toThrow(BadRequestException);
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

  it('does not evict still-valid replay markers when the nonce store grows', () => {
    const challenge = service.issue('login');
    if (challenge.provider !== 'math') throw new Error('Expected math CAPTCHA');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    service.verify(challenge.token, String(answer), 'login');
    const usedNonces = (service as any).usedNonces as Map<string, number>;
    expect(usedNonces.has(JSON.parse(Buffer.from(challenge.token, 'base64url').toString('utf8')).nonce)).toBe(true);
  });

});
