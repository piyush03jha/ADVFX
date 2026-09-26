import {
  Body,
  BadRequestException,
  Res,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.categoriesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/image')
  async uploadImage(@Param('id') id: string, @Res() reply: FastifyReply) {
    const request = reply.request as FastifyRequest & {
      file?: () => Promise<{
        filename: string;
        mimetype: string;
        toBuffer: () => Promise<Buffer>;
      } | undefined>;
    };

    if (typeof request.file !== 'function') {
      throw new BadRequestException('Multipart upload support is not available');
    }

    const uploadedFile = await request.file();
    if (!uploadedFile) throw new BadRequestException('Category image file is required');

    const buffer = await uploadedFile.toBuffer();
    return reply.send(await this.categoriesService.uploadImage(id, {
      originalname: uploadedFile.filename,
      mimetype: uploadedFile.mimetype,
      buffer,
    }));
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}