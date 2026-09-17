import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CheckoutService } from './checkout.service';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';

@UseGuards(CustomerAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('quote')
  getQuote(@Req() req: any, @Body() dto: CheckoutQuoteDto) {
    return this.checkoutService.getQuote(req.user.id, dto);
  }

  @Get('orders/:orderId/status')
  getOrderStatus(@Req() req: any, @Param('orderId') orderId: string) {
    return this.checkoutService.getStatus(req.user.id, orderId);
  }
}
