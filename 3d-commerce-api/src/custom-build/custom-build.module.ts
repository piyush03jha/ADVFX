import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessingJobsModule } from '../processing-jobs/processing-jobs.module';
import { StorageModule } from '../storage/storage.module';

import { CustomBuildController } from './custom-build.controller';
import { CustomBuildFilesController } from './custom-build.files.controller';
import { CustomBuildService } from './custom-build.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    CartModule,
    NotificationsModule,
    AuthModule,
    ProcessingJobsModule,
  ],

  controllers: [
    CustomBuildController,
    CustomBuildFilesController,
  ],

  providers: [CustomBuildService],

  exports: [CustomBuildService],
})
export class CustomBuildModule {}