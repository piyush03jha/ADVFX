import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReturnsService } from './returns.service';
import { AuthModule } from '../auth/auth.module';
import { OrdersExpirationScheduler } from './orders-expiration.scheduler';
import { RazorpayService } from '../payments/razorpay.service';

@Module({
  imports: [PrismaModule, NotificationsModule, PricingModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, ReturnsService, OrdersExpirationScheduler, RazorpayService],
  exports: [OrdersService, ReturnsService],
})
export class OrdersModule {}
