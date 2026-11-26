import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WhatsAppOrderWorker } from './whatsapp-order.worker';

@Module({
  imports: [PrismaModule, AuthModule],

  controllers: [NotificationsController],

  providers: [NotificationsService, WhatsAppOrderWorker],

  exports: [NotificationsService],
})
export class NotificationsModule {}