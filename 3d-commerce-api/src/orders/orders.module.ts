import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReturnsService } from './returns.service';
import { AuthModule } from '../auth/auth.module';
import { OrdersExpirationScheduler } from './orders-expiration.scheduler';

@Module({
  imports: [PrismaModule, NotificationsModule, PricingModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, ReturnsService, OrdersExpirationScheduler],
  exports: [OrdersService, ReturnsService],
})
export class OrdersModule {}
