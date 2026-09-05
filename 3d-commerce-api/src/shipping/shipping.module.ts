import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
