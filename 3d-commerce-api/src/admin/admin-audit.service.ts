import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; summary: string; metadata?: unknown }) {
    const actor = input.actorId ? await this.prisma.user.findUnique({ where: { id: input.actorId }, select: { email: true } }) : null;
    return this.prisma.adminAuditLog.create({ data: {
      actorId: input.actorId ?? null,
      actorEmail: actor?.email ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
    }});
  }

  async list(input: { page?: number; pageSize?: number; action?: string; entityType?: string }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 25));
    const where = { ...(input.action ? { action: input.action } : {}), ...(input.entityType ? { entityType: input.entityType } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*pageSize, take: pageSize,  }),
    ]);
    return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total/pageSize)) };
  }
}
