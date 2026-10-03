import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AuthCaptchaService } from './captcha.service';

describe('AuthCaptchaService', () => {
  const service = new AuthCaptchaService();

  beforeEach(() => {
    process.env.AUTH_CAPTCHA_SECRET = 'test-captcha-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AUTH_CAPTCHA_PROVIDER;
    delete process.env.TURNSTILE_SECRET;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_HOSTNAMES;
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ORIGINS;
  });

  it('accepts the answer for a matching challenge and purpose', () => {
    const challenge = service.issue('login');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    expect(() => service.verify(challenge.token, String(answer), 'login')).not.toThrow();
  });

  it('rejects incorrect answers and purpose changes', () => {
    const challenge = service.issue('login');
    expect(() => service.verify(challenge.token, '99', 'login')).toThrow(BadRequestException);
    expect(() => service.verify(challenge.token, '0', 'register')).toThrow(BadRequestException);
  });

  it('rejects replay of a successfully solved challenge', () => {
    const challenge = service.issue('register');
    const answer = challenge.operator === '+' ? challenge.first + challenge.second : challenge.first - challenge.second;
    expect(() => service.verify(challenge.token, String(answer), 'register')).not.toThrow();
    expect(() => service.verify(challenge.token, String(answer), 'register')).toThrow(BadRequestException);
  });

  describe('turnstile', () => {
    beforeEach(() => {
      process.env.AUTH_CAPTCHA_PROVIDER = 'turnstile';
      process.env.TURNSTILE_SECRET_KEY = 'secret';
      process.env.TURNSTILE_HOSTNAMES = 'https://Example.com/, www.example.com:443';
    });

    it('accepts a valid token and normalises configured hostnames', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, action: 'register', hostname: 'example.com' }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'register')).resolves.toBeUndefined();
    });

    it('falls back to FRONTEND_URL when TURNSTILE_HOSTNAMES is unset', async () => {
      delete process.env.TURNSTILE_HOSTNAMES;
      process.env.FRONTEND_URL = 'https://shop.example.org';
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, action: 'login', hostname: 'shop.example.org' }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'login')).resolves.toBeUndefined();
    });

    it('rejects a hostname or action mismatch', async () => {
      const fetch = jest.spyOn(global, 'fetch');
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, action: 'register', hostname: 'evil.test' }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'register')).rejects.toBeInstanceOf(BadRequestException);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, action: 'login', hostname: 'example.com' }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'register')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports an expired or reused token distinctly', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'login')).rejects.toThrow(/expired/i);
    });

    it('treats a rejected secret as server misconfiguration', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, 'error-codes': ['invalid-input-secret'] }),
      } as Response);
      await expect(service.verifyForAuth('tok', undefined, 'login')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('exposes the configured public site key without exposing the secret', () => {
      process.env.TURNSTILE_SITE_KEY = '0x-test-site-key';
      expect(service.siteKey()).toBe('0x-test-site-key');
    });
  });
});
