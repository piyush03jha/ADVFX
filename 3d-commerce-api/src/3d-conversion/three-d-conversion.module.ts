import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { ThreeDConversionController } from "./three-d-conversion.controller";
import { ThreeDConversionService } from "./three-d-conversion.service";
import { ThreeDConversionWorker } from "./three-d-conversion.worker";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ThreeDConversionController],
  providers: [ThreeDConversionService, ThreeDConversionWorker],
  exports: [ThreeDConversionService],
})
export class ThreeDConversionModule {}
