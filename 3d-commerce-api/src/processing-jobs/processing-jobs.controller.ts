import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ProcessingJobsService } from './processing-jobs.service';
import { ProcessingJobsWorker } from './processing-jobs.worker';

@UseGuards(AuthGuard, AdminGuard)
@Controller('processing-jobs')
export class ProcessingJobsController {
  constructor(
    private readonly processingJobsService: ProcessingJobsService,
    private readonly processingJobsWorker: ProcessingJobsWorker,
  ) {}

  @Post()
  async create(@Body('productFileId') productFileId: string) {
    return this.processingJobsService.create(productFileId);
  }

  @Get()
  async findAll() {
    return this.processingJobsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.processingJobsService.findOne(id);
  }

  /**
   * Internal/admin operational endpoint for running the existing worker.
   * The worker itself is unchanged and can still be invoked directly by
   * application code without going through HTTP authentication.
   */
  @Post('worker/run')
  async runWorker() {
    const processed = await this.processingJobsWorker.processNextJob();

    return {
      processed,
    };
  }
}
