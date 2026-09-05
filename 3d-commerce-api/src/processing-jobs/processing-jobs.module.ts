import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { ProductFilesModule } from "../product-files/product-files.module";

import { ProcessingJobsController } from "./processing-jobs.controller";
import { ProcessingJobsService } from "./processing-jobs.service";
import { ProcessingJobsWorker } from "./processing-jobs.worker";
import { ProcessingJobs2DWorker } from "./processing-jobs-2d.worker";
import { ImageProcessingService } from "./image-processing.service";

import { ModelConverterService } from "./converters/model-converter.service";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => ProductFilesModule),
  ],

  controllers: [
    ProcessingJobsController,
  ],

  providers: [
    ProcessingJobsService,
    ProcessingJobsWorker,
    ProcessingJobs2DWorker,
    ImageProcessingService,
    ModelConverterService,
  ],

  exports: [
    ProcessingJobsService,
    ProcessingJobsWorker,
    ProcessingJobs2DWorker,
    ImageProcessingService,
    ModelConverterService,
  ],
})
export class ProcessingJobsModule {}