import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [CartController],

  providers: [CartService],

  exports: [CartService],
})
export class CartModule {}