import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateShippingRuleDto } from './dto/create-shipping-rule.dto';
import { UpdateShippingRuleDto } from './dto/update-shipping-rule.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @UseGuards(AuthGuard, AdminGuard)
  @Get('rules')
  listRules(@Query('includeInactive') includeInactive?: string) {
    return this.shipping.listRules(includeInactive === 'true');
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('rules')
  createRule(@Body() dto: CreateShippingRuleDto) {
    return this.shipping.createRule(dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateShippingRuleDto) {
    return this.shipping.updateRule(id, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('rules/:id/deactivate')
  deactivateRule(@Param('id') id: string) {
    return this.shipping.deactivateRule(id);
  }

  @Get('delivery-check/:postalCode')
  deliveryCheck(@Param('postalCode') postalCode: string) {
    return this.shipping.deliveryCheck(postalCode);
  }
}