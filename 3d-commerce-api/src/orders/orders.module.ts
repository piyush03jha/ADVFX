import { Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReturnsService } from './returns.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PricingModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, ReturnsService],
  providers: [OrdersService, ReturnsService, OrdersExpirationScheduler],
  exports: [OrdersService, ReturnsService],
})
export class OrdersModule {}
