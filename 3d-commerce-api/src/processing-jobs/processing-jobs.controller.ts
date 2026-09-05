import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ProcessingJobsService } from "./processing-jobs.service";
import { ProcessingJobsWorker } from "./processing-jobs.worker";

@Controller("processing-jobs")
export class ProcessingJobsController {
  constructor(
    private readonly processingJobsService: ProcessingJobsService,
    private readonly processingJobsWorker: ProcessingJobsWorker,
  ) {}

  @Post()
  async create(
    @Body("productFileId") productFileId: string,
  ) {
    return this.processingJobsService.create(productFileId);
  }

  @Get()
  async findAll() {
    return this.processingJobsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.processingJobsService.findOne(id);
  }

/**
   * Temporary development endpoint.
   *
   * This will later be replaced by a real background
   * worker/queue consumer.
   */
  @Post("worker/run")
  async runWorker() {
    const processed =
      await this.processingJobsWorker.processNextJob();

    return {
      processed,
    };
  }
}