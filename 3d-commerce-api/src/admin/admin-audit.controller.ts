import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminAuditService } from './admin-audit.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}
  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('action') action?: string, @Query('entityType') entityType?: string) {
    return this.audit.list({ page: Number(page)||1, pageSize: Number(pageSize)||25, action, entityType });
  }
}
