import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(CustomerAuthGuard)
  @Post('razorpay/order')
  createOrder(@Req() req: any, @Body() dto: CreateRazorpayOrderDto) {
    return this.payments.createRazorpayOrder(req.user.id, dto.orderId);
  }

  @UseGuards(CustomerAuthGuard)
  @Post('razorpay/verify')
  verify(@Req() req: any, @Body() dto: VerifyRazorpayPaymentDto) {
    return this.payments.verifyRazorpayPayment(req.user.id, dto);
  }

  @Post('razorpay/webhook')
  webhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event') event: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Webhook body is missing');
    }

    return this.payments.handleWebhook(
      rawBody.toString('utf8'),
      signature,
      event,
    );
  }
}
