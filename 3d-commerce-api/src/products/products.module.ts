import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ProcessingJobsModule } from '../processing-jobs/processing-jobs.module';
import { ProcessingJobsModule } from '../processing-jobs/processing-jobs.module';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ModelMultipartController } from './model-multipart.controller';
import { ModelMultipartService } from './model-multipart.service';

@Module({
  imports: [StorageModule, AuthModule, ProcessingJobsModule],
  controllers: [ProductsController, ModelMultipartController],
  providers: [ProductsService, ModelMultipartService],
  exports: [ProductsService],
})
export class ProductsModule {}