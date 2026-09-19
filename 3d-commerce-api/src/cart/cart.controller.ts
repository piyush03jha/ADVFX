import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';

@UseGuards(CustomerAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getOrCreate(req.user.id);
  }

  @Post('items')
  addItem(@Req() req: any, @Body() dto: UpsertCartItemDto) {
    return this.cartService.addItem(req.user.id, dto.productId, dto.quantity, dto.variantId);
  }

  @Patch('items/:productId')
  updateItem(@Req() req: any, @Param('productId') productId: string, @Body() dto: UpsertCartItemDto) {
    return this.cartService.updateItem(req.user.id, productId, dto.quantity, dto.variantId);
  }

  @Delete('items/:productId')
  removeItem(@Req() req: any, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.id, productId, typeof req.query?.variantId === 'string' ? req.query.variantId : undefined);
  }

  @Delete()
  clear(@Req() req: any) {
    return this.cartService.clear(req.user.id);
  }
}
