import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';

@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(req: any) {
    return this.cartService.getOrCreate(req.user.id);
  }

  @Post('items')
  addItem(req: any, @Body() dto: UpsertCartItemDto) {
    return this.cartService.addItem(req.user.id, dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  updateItem(req: any, @Param('productId') productId: string, @Body() dto: UpsertCartItemDto) {
    return this.cartService.updateItem(req.user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  removeItem(req: any, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.id, productId);
  }

  @Delete()
  clear(req: any) {
    return this.cartService.clear(req.user.id);
  }
}
