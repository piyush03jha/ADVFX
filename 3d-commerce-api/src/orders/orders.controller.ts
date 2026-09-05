import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { AdminOrderListDto } from './dto/admin-order-list.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnsService } from './returns.service';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly returnsService: ReturnsService,
  ) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(
      req.user.id,
      dto.shippingAddressId,
      dto.couponCode,
    );
  }

  @Get()
  findMine(@Req() req: any) {
    return this.ordersService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.id, id);
  }

  @Post(':id/return-request')
  createReturnRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.returnsService.create(req.user.id, id, dto);
  }

  @Get('returns/mine')
  findMineReturns(@Req() req: any) {
    return this.returnsService.mine(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get('admin/list')
  findAllAdmin(@Query('status') status?: OrderStatus) {
    if (status && !Object.values(OrderStatus).includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    return this.ordersService.findAllAdmin(status);
  }

  @UseGuards(AdminGuard)
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @UseGuards(AdminGuard)
  @Get('admin/returns')
  findAllReturns() {
    return this.returnsService.findAllAdmin();
  }

  @UseGuards(AdminGuard)
  @Patch('admin/returns/:id')
  updateReturnStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED',
  ) {
    return this.returnsService.updateStatus(id, status);
  }
}
