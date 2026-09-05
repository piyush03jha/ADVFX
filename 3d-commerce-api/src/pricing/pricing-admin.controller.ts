import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { PricingAdminService } from './pricing-admin.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/pricing')
export class PricingAdminController {
  constructor(private readonly pricingAdmin: PricingAdminService) {}

  @Get('tax-rules')
  listTaxRules() {
    return this.pricingAdmin.listTaxRules();
  }

  @Post('tax-rules')
  createTaxRule(@Body() dto: CreateTaxRuleDto) {
    return this.pricingAdmin.createTaxRule(dto);
  }

  @Delete('tax-rules/:id')
  deactivateTaxRule(@Param('id') id: string) {
    return this.pricingAdmin.deactivateTaxRule(id);
  }

  @Get('promotions')
  listPromotions() {
    return this.pricingAdmin.listPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.pricingAdmin.createPromotion(dto);
  }

  @Delete('promotions/:id')
  deactivatePromotion(@Param('id') id: string) {
    return this.pricingAdmin.deactivatePromotion(id);
  }
}
