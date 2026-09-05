import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateShippingRuleDto } from './dto/create-shipping-rule.dto';
import { UpdateShippingRuleDto } from './dto/update-shipping-rule.dto';
import { ShippingService } from './shipping.service';

@UseGuards(AuthGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @UseGuards(AdminGuard)
  @Get('rules')
  listRules(@Query('includeInactive') includeInactive?: string) {
    return this.shipping.listRules(includeInactive === 'true');
  }

  @UseGuards(AdminGuard)
  @Post('rules')
  createRule(@Body() dto: CreateShippingRuleDto) {
    return this.shipping.createRule(dto);
  }

  @UseGuards(AdminGuard)
  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateShippingRuleDto) {
    return this.shipping.updateRule(id, dto);
  }

  @UseGuards(AdminGuard)
  @Post('rules/:id/deactivate')
  deactivateRule(@Param('id') id: string) {
    return this.shipping.deactivateRule(id);
  }
}
