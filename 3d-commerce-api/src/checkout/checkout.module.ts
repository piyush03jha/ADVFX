import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, PricingModule, AuthModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
