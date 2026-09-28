import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminBulkService } from './admin-bulk.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/products')
export class AdminBulkController {
  constructor(private readonly service: AdminBulkService) {}

  @Post('bulk')
  bulk(@Req() req: any, @Body() body: { ids?: string[]; action?: 'ARCHIVE'|'ACTIVATE'|'FEATURE'|'UNFEATURE'|'TRENDING'|'UNTRENDING' }) {
    if (!Array.isArray(body.ids) || !body.ids.length || !body.action) throw new BadRequestException('ids and action are required');
    return this.service.bulk(req.user?.id, body.ids, body.action);
  }

  @Post('duplicate')
  duplicate(@Req() req: any, @Body('productId') productId: string) {
    if (!productId) throw new BadRequestException('productId is required');
    return this.service.duplicate(req.user?.id, productId);
  }

  @Post('import-csv')
  importCsv(@Req() req: any, @Body('csv') csv: string) {
    if (!csv?.trim()) throw new BadRequestException('csv is required');
    return this.service.importCsv(req.user?.id, csv);
  }
}
