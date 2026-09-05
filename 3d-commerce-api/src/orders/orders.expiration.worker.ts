import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersExpirationWorker {
  private readonly logger = new Logger(OrdersExpirationWorker.name);

  constructor(private readonly ordersService: OrdersService) {}

  async processExpiredReservations(): Promise<{ expiredOrders: number }> {
    const result = await this.ordersService.expireReservations();

    if (result.expiredOrders > 0) {
      this.logger.log(`Expired ${result.expiredOrders} payment-pending order(s)`);
    }

    return result;
  }
}
