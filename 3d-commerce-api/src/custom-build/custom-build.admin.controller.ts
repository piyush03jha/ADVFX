import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CustomBuildService } from "./custom-build.service";
import { CreateCustomBuildOptionDto, UpdateCustomBuildCategoryDto, UpdateCustomBuildOptionDto } from "./custom-build.config.dto";
import { FastifyReply, FastifyRequest } from "fastify";

@UseGuards(AuthGuard, AdminGuard)
@Controller("custom-requests/admin/config")
export class CustomBuildAdminController {
  constructor(private readonly service: CustomBuildService) {}

  @Get()
  config() { return this.service.getAdminConfig(); }

  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCustomBuildCategoryDto) {
    return this.service.updateConfigCategory(id, dto);
  }

  @Post("categories")
  createCategory(@Body() body: { slug: string; name: string; description?: string; basePriceMinor?: number; sortOrder?: number; isActive?: boolean }) {
    if (!body.slug || !body.name) throw new BadRequestException("slug and name are required");
    return this.service.createConfigCategory(body);
  }

  @Post("categories/:id/options")
  createOption(@Param("id") id: string, @Body() dto: CreateCustomBuildOptionDto) {
    return this.service.createConfigOption(id, dto);
  }

  @Patch("options/:id")
  updateOption(@Param("id") id: string, @Body() dto: UpdateCustomBuildOptionDto) {
    return this.service.updateConfigOption(id, dto);
  }

  @Delete("options/:id")
  deleteOption(@Param("id") id: string) {
    return this.service.deleteConfigOption(id);
  }

  @Post("categories/:id/image")
  async uploadCategoryImage(@Param("id") id: string, @Res() reply: FastifyReply) {
    const request = reply.request as FastifyRequest & { file?: () => Promise<any> };
    if (typeof request.file !== "function") throw new BadRequestException("Multipart upload support is not available");
    const file = await request.file();
    if (!file) throw new BadRequestException("Image file is required");
    return reply.send(await this.service.uploadConfigCategoryImage(id, {
      originalname: file.filename, mimetype: file.mimetype, buffer: await file.toBuffer(),
    }));
  }
}
