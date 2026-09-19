import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';

import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@UseGuards(CustomerAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Req() req: any) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post('items')
  addItem(@Req() req: any, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.addItem(req.user.id, dto.productId);
  }

  @Delete('items/:productId')
  removeItem(@Req() req: any, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(req.user.id, productId);
  }

  @Delete()
  clear(@Req() req: any) {
    return this.wishlistService.clear(req.user.id);
  }
}
