import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessingJobsModule } from '../processing-jobs/processing-jobs.module';
import { StorageModule } from '../storage/storage.module';

import { ProductFilesController } from './product-files.controller';
import { ProductFilesService } from './product-files.service';
import { FileContentValidationService } from './file-content-validation.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
    forwardRef(() => ProcessingJobsModule),
  ],
  controllers: [ProductFilesController],
  providers: [
    ProductFilesService,
    FileContentValidationService,
  ],
  exports: [
    ProductFilesService,
    FileContentValidationService,
  ],
})
export class ProductFilesModule {}