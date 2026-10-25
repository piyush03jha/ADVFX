import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersExpirationScheduler {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireReservations() {
    await this.ordersService.expireReservations();
    await this.paymentsService.recoverPendingRefunds();
  }
}
