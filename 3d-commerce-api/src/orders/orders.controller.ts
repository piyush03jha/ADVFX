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
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { OrdersService } from './orders.service';
import { ReturnsService } from './returns.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly returnsService: ReturnsService,
  ) {}

  @UseGuards(CustomerAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(
      req.user.id,
      dto.shippingAddressId,
      dto.couponCode,
      dto.idempotencyKey,
      {
        subtotalMinor: dto.quotedSubtotalMinor,
        shippingMinor: dto.quotedShippingMinor,
        discountMinor: dto.quotedDiscountMinor,
        taxMinor: dto.quotedTaxMinor,
        totalMinor: dto.quotedTotalMinor,
        currency: dto.quotedCurrency,
      },
    );
  }

  @UseGuards(CustomerAuthGuard)
  @Get()
  findMine(@Req() req: any) {
    return this.ordersService.findMine(req.user.id);
  }

  @UseGuards(CustomerAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.id, id);
  }

  @UseGuards(CustomerAuthGuard)
  @Post(':id/return-request')
  createReturnRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.returnsService.create(req.user.id, id, dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('returns/mine')
  findMineReturns(@Req() req: any) {
    return this.returnsService.mine(req.user.id);
  }

  @UseGuards(AuthGuard, AdminGuard)
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

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/returns')
  findAllReturns() {
    return this.returnsService.findAllAdmin();
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/returns/:id')
  updateReturnStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED',
  ) {
    return this.returnsService.updateStatus(id, status);
  }
}
