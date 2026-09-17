import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AuthService } from '../auth.service';

const BEARER_PREFIX = 'Bearer ';

/** Authenticates the customer sessions issued by POST /auth/login. */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required');
    }

    request.user = await this.authService.authenticateCustomer(token);
    return true;
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) return null;

    const [scheme, token] = authorization.split(/\s+/);
    if (
      scheme?.toLowerCase() !== BEARER_PREFIX.trim().toLowerCase() ||
      !token ||
      token.length > 128
    ) {
      return null;
    }

    return token;
  }
}
