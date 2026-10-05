import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ThreeDConversionService } from "./three-d-conversion.service";

@Controller("3d-conversion")
@UseGuards(AuthGuard, AdminGuard)
export class ThreeDConversionController {
  constructor(private readonly service: ThreeDConversionService) {}

  @Post("upload")
  start(
    @Body() body: { originalName: string; size: number },
    @Res() reply: FastifyReply,
  ) {
    const user = (reply.request as FastifyReply["request"] & { user?: { id?: string } }).user;
    return this.service.start(body?.originalName, body?.size, user?.id);
  }

  @Post(":id/complete")
  complete(
    @Param("id") id: string,
    @Body() body: { key: string; uploadId: string; size: number; parts: { PartNumber: number; ETag: string }[] },
  ) {
    return this.service.complete(id, body);
  }

  @Post(":id/abort")
  abort(@Param("id") id: string, @Body("uploadId") uploadId: string) {
    return this.service.abort(id, uploadId);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id/download")
  async download(@Param("id") id: string) {
    const result = await this.service.download(id);
    return new StreamableFile(result.stream, {
      type: "model/gltf-binary",
      disposition: "attachment; filename=\"" + encodeURIComponent(result.filename) + "\"",
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post(":id/retry")
  retry(@Param("id") id: string) {
    return this.service.retry(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
