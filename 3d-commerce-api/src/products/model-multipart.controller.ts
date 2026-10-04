import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ModelMultipartService } from "./model-multipart.service";

@Controller("products/:productId/model-multipart")
@UseGuards(AuthGuard, AdminGuard)
export class ModelMultipartController {
  constructor(private readonly service: ModelMultipartService) {}

  @Post()
  start(
    @Param("productId") productId: string,
    @Body() body: { size: number },
  ) {
    return this.service.start(productId, body?.size);
  }

  @Post("complete")
  complete(
    @Param("productId") productId: string,
    @Body() body: {
      key: string;
      uploadId: string;
      size: number;
      originalName: string;
      parts: { PartNumber: number; ETag: string }[];
    },
  ) {
    return this.service.complete(productId, body);
  }
}
