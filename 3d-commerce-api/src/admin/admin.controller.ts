import { BadRequestException, Body, Controller, Req, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('promotions')
  promotions() { return this.adminService.promotions(); }

  @Post('promotions')
  upsertPromotion(@Body() body: any) { return this.adminService.upsertPromotion(body); }

  @Patch('promotions/:id/status')
  setPromotionActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.setPromotionActive(id, Boolean(isActive));
  }

  @Get('tax-rules')
  taxRules() { return this.adminService.taxRules(); }

  @Post('tax-rules')
  upsertTaxRule(@Body() body: any) { return this.adminService.upsertTaxRule(body); }

  @Patch('tax-rules/:id/status')
  setTaxRuleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.setTaxRuleActive(id, Boolean(isActive));
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

  @Get('notifications/audience')
  notificationAudience(@Query('search') search?: string) { return this.adminService.notificationAudience(search); }

  @Post('notifications/broadcast')
  sendAnnouncement(@Req() req: any, @Body() body: { userIds?: string[]; title?: string; message?: string }) { return this.adminService.sendAnnouncement({ userIds: body.userIds, title: body.title ?? '', message: body.message ?? '', actorId: req.user?.id }); }

  @Get('analytics')
  analytics(@Query('days') days?: string) { return this.adminService.analytics(Number(days) || 30); }

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