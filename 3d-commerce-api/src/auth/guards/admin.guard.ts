import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access is required');
    }

    return true;
  }
}
