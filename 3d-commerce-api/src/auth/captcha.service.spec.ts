import { BadRequestException } from '@nestjs/common';
import { AuthCaptchaService } from './captcha.service';

describe('AuthCaptchaService', () => {
  const service = new AuthCaptchaService();

  beforeEach(() => {
    process.env.AUTH_CAPTCHA_SECRET = 'test-captcha-secret';
  });

  it('accepts the answer for a matching challenge and purpose', () => {
    const challenge = service.issue('login');
    const answer =
      challenge.operator === '+'
        ? challenge.first + challenge.second
        : challenge.first - challenge.second;

    expect(() =>
      service.verify(challenge.token, String(answer), 'login'),
    ).not.toThrow();
  });

  it('rejects incorrect answers and purpose changes', () => {
    const challenge = service.issue('login');

    expect(() =>
      service.verify(challenge.token, '99', 'login'),
    ).toThrow(BadRequestException);

    expect(() =>
      service.verify(challenge.token, '0', 'register'),
    ).toThrow(BadRequestException);
  });

  it('rejects replay of a successfully solved challenge', () => {
    const challenge = service.issue('register');
    const answer =
      challenge.operator === '+'
        ? challenge.first + challenge.second
        : challenge.first - challenge.second;

    expect(() =>
      service.verify(challenge.token, String(answer), 'register'),
    ).not.toThrow();

    expect(() =>
      service.verify(challenge.token, String(answer), 'register'),
    ).toThrow(BadRequestException);
  });
});
