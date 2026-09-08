import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { OrdersService } from './orders.service';
import { ReturnsService } from './returns.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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
  findAllAdmin(@Query('status') status?: string) {
    let parsedStatus: OrderStatus | undefined;

    if (status !== undefined) {
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new BadRequestException(`Invalid order status: ${status}`);
      }
      parsedStatus = status as OrderStatus;
    }

    return this.ordersService.findAllAdmin(parsedStatus);
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
