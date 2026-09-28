import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminBulkController } from './admin-bulk.controller';
import { AdminBulkService } from './admin-bulk.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController, AdminAuditController, AdminBulkController],
  providers: [AdminService, AdminAuditService, AdminBulkService],
  exports: [AdminService],
})
export class AdminModule {}