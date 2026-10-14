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
    delete process.env.RECAPTCHA_SECRET;
    delete process.env.RECAPTCHA_SECRET_KEY;
    delete process.env.RECAPTCHA_SITE_KEY;
    delete process.env.RECAPTCHA_EXPECTED_HOSTNAME;
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

  it('issues a reCAPTCHA challenge when configured', () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'recaptcha';
    process.env.RECAPTCHA_SITE_KEY = 'test-site-key';
    expect(service.issue('login')).toEqual({ provider: 'recaptcha', siteKey: 'test-site-key' });
  });

  it('calls Google Siteverify and validates hostname', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'recaptcha';
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    process.env.RECAPTCHA_EXPECTED_HOSTNAME = 'voxel3d.org';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, hostname: 'voxel3d.org' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(service.verifyForAuth('recaptcha-token', undefined, 'login')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it('rejects failed Google validation and mismatched hostname', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'recaptcha';
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    process.env.RECAPTCHA_EXPECTED_HOSTNAME = 'voxel3d.org';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    }) as unknown as typeof fetch;
    await expect(service.verifyForAuth('expired', undefined, 'login')).rejects.toThrow(BadRequestException);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, hostname: 'attacker.example' }),
    }) as unknown as typeof fetch;
    await expect(service.verifyForAuth('wrong-host', undefined, 'login')).rejects.toThrow(BadRequestException);
  });

  it('fails closed when Google is unavailable or the secret is absent', async () => {
    process.env.AUTH_CAPTCHA_PROVIDER = 'recaptcha';
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(service.verifyForAuth('token', undefined, 'login')).rejects.toThrow(ServiceUnavailableException);
    delete process.env.RECAPTCHA_SECRET_KEY;
    await expect(service.verifyForAuth('token', undefined, 'login')).rejects.toThrow(ServiceUnavailableException);
  });
});
