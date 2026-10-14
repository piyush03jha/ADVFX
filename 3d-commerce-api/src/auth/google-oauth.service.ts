import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface GoogleIdentity {
  googleSubject: string;
  email: string;
  name: string | null;
}

interface GoogleTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new UnauthorizedException('Google OAuth is not configured.');
    }

    if (!code?.trim()) {
      throw new UnauthorizedException('Google authorization code is required.');
    }
    if (!codeVerifier?.trim()) {
      throw new UnauthorizedException('Google PKCE verifier is required.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier.trim(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const tokens = (await tokenResponse.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token) {
      // Do not echo Google's error text to the client.
      throw new UnauthorizedException('Google authorization code could not be exchanged.');
    }

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });

    const userInfo = (await userResponse.json().catch(() => ({}))) as GoogleUserInfo;
    if (
      !userResponse.ok ||
      !userInfo.sub ||
      !userInfo.email ||
      userInfo.email_verified !== true
    ) {
      throw new UnauthorizedException('Google account information could not be verified.');
    }

    return {
      googleSubject: userInfo.sub,
      email: userInfo.email.trim().toLowerCase(),
      name: userInfo.name?.trim() || null,
    };
  }

  async findOrCreateCustomer(
    googleSubject: string,
    email: string,
    name: string | null,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingIdentity = await this.prisma.customerOAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: OAuthProvider.GOOGLE,
          providerSubject: googleSubject,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (existingIdentity) {
      if (!existingIdentity.user.isActive || existingIdentity.user.role !== 'CUSTOMER') {
        throw new UnauthorizedException('User account is inactive.');
      }

      return existingIdentity.user;
    }

    const user = await this.prisma.$transaction(async (tx) => {
      let customer = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
        },
      });

      if (customer) {
        if (customer.role !== 'CUSTOMER' || !customer.isActive) {
          throw new UnauthorizedException('This email is not available for customer sign-in.');
        }

        // If a password account's email was never verified, Google now proves
        // ownership. Remove its password credential and revoke live sessions before
        // linking the verified Google identity to avoid account pre-hijacking.
        if (!customer.emailVerifiedAt) {
          await tx.customerCredential.deleteMany({ where: { userId: customer.id } });
          await tx.customerAuthSession.updateMany({
            where: { userId: customer.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        customer = await tx.user.update({
          where: { id: customer.id },
          data: {
            name: customer.name || name,
            emailVerifiedAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        });
      } else {
        customer = await tx.user.create({
          data: {
            email: normalizedEmail,
            name,
            role: 'CUSTOMER',
            isActive: true,
            emailVerifiedAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        });
      }

      await tx.customerOAuthIdentity.create({
        data: {
          userId: customer.id,
          provider: OAuthProvider.GOOGLE,
          providerSubject: googleSubject,
          email: normalizedEmail,
        },
      });

      return customer;
    });

    return user;
  }
}
