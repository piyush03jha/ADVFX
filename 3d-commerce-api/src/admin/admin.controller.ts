import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() { return this.adminService.dashboard(); }

  @Get('settings')
  settings() { return this.adminService.settings(); }

  @Patch('settings')
  updateSettings(@Body() body: { hero?: unknown; storefront?: unknown }) {
    return this.adminService.updateSettings(body);
  }

  @Get('delivery-zones')
  deliveryZones(@Query('includeInactive') includeInactive?: string) {
    return this.adminService.deliveryZones(includeInactive !== 'false');
  }

  @Post('delivery-zones')
  upsertDeliveryZone(@Body() body: { postalCode?: string; coverage?: 'DELIVERED' | 'NOT_DELIVERED'; label?: string; active?: boolean }) {
    if (!body.postalCode || !body.coverage) throw new BadRequestException('postalCode and coverage are required');
    return this.adminService.upsertDeliveryZone(body.postalCode, body.coverage, body.label, body.active !== false);
  }

  @Patch('delivery-zones/:id')
  updateDeliveryZone(@Param('id') id: string, @Body() body: { postalCode?: string; coverage?: 'DELIVERED' | 'NOT_DELIVERED'; label?: string; active?: boolean }) {
    return this.adminService.deliveryZones(true).then(async (zones) => {
      const current = zones.find((zone) => zone.id === id);
      if (!current) throw new BadRequestException('Delivery zone not found');
      return this.adminService.upsertDeliveryZone(body.postalCode ?? current.postalCode, body.coverage ?? current.coverage, body.label ?? current.label ?? undefined, body.active ?? current.active);
    });
  }

  @Post('delivery-zones/:id/deactivate')
  deactivateDeliveryZone(@Param('id') id: string) {
    return this.adminService.removeDeliveryZone(id);
  }

  @Get('customers')
  customers(@Query('search') search?: string) { return this.adminService.customers(search); }

  @Patch('customers/:id/status')
  setCustomerActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.setCustomerActive(id, isActive);
  }

  @Get('catalog')
  catalog() { return this.adminService.catalog(); }

  @Get('merchandising')
  merchandising(@Query('limit') limit?: string) {
    const parsed = Number(limit ?? 8);
    return this.adminService.merchandising(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : 8);
  }

  @Get('delivery-check/:postalCode')
  deliveryCheck(@Param('postalCode') postalCode: string) {
    return this.adminService.isPostalCodeDeliverable(postalCode);
  }
}