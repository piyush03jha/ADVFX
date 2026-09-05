import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
