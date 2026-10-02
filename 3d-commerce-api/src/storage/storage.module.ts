import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

import { AssetController } from "./asset.controller";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [StorageController, AssetController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
