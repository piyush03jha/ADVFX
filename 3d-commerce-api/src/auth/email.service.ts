import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.getFrontendUrl();
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.send({
      to: email,
      subject: 'Verify your 3D Commerce account',
      html: `
        <p>Verify your account to continue.</p>
        <p><a href="${verificationUrl}">Verify email</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.send({
      to: email,
      subject: 'Reset your 3D Commerce password',
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 30 minutes.</p>
      `,
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    html: string;
  }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM;

    this.logger.log(
      `Preparing authentication email: to=${input.to}, from=${from ?? 'MISSING'}, apiKey=${apiKey ? 'SET' : 'MISSING'}`,
    );

    if (!apiKey || !from) {
      this.logger.error(
        `Email delivery is not configured: RESEND_API_KEY=${apiKey ? 'SET' : 'MISSING'}, AUTH_EMAIL_FROM=${from ? 'SET' : 'MISSING'}`,
      );

      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      throw new ServiceUnavailableException(
        'Email delivery is not configured.',
      );
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      });

      const responseBody = await response.text();

      if (!response.ok) {
        this.logger.error(
          `Resend rejected email: status=${response.status}, body=${responseBody}`,
        );

        throw new ServiceUnavailableException(
          'Unable to send authentication email.',
        );
      }

      this.logger.log(
        `Resend accepted email: status=${response.status}, body=${responseBody}`,
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        'Failed to contact Resend API.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'Unable to send authentication email.',
      );
    }
  }

  private getFrontendUrl() {
    return (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }
}