import { Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ShipmentsService } from './shipments.service';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@UseGuards(AdminGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get('order/:orderId')
  findOne(@Param('orderId') orderId: string) {
    return this.shipmentsService.findOne(orderId);
  }

  @Patch('order/:orderId')
  update(@Param('orderId') orderId: string, @Body() dto: UpdateShipmentDto) {
    return this.shipmentsService.update(orderId, dto);
  }
}
