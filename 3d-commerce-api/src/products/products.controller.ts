import {
  Body,
  Req,
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
  StreamableFile,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';
import { UpsertVariantDto } from './dto/upsert-variant.dto';
import { ProductsService } from './products.service';
import { StorageService } from '../storage/storage.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('shop')
  findShopPage(@Query() query: Record<string, string | undefined>) {
    const num = (value?: string) => {
      if (value === undefined || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const sorts = ['featured', 'newest', 'popular', 'rating', 'price-low', 'price-high'] as const;
    const sort = sorts.find((item) => item === query.sort);

    return this.productsService.findShopPage({
      page: num(query.page) ?? 1,
      limit: num(query.limit) ?? 12,
      q: query.q?.slice(0, 100),
      categories: query.category?.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10),
      minPrice: num(query.minPrice),
      maxPrice: num(query.maxPrice),
      minRating: num(query.minRating),
      sort,
    });
  }

  @Get('hero')
  findHeroProducts() {
    return this.productsService.findHeroProducts();
  }

  @Get('reviews/latest')
  getLatestReviews() {
    return this.productsService.getLatestReviews();
  }

  @Post(':id/view')
  recordView(@Param('id') id: string) {
    return this.productsService.recordView(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get(':id/metrics')
  getMetrics(@Param('id') id: string) {
    return this.productsService.getMetrics(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/reviews')
  findAllAdminReviews() {
    return this.productsService.findAllAdminReviews();
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/reviews/:reviewId')
  setReviewPublished(
    @Param('reviewId') reviewId: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.productsService.setReviewPublished(reviewId, isPublished);
  }

  @UseGuards(CustomerAuthGuard)
  @Get(':id/review-eligibility')
  getReviewEligibility(@Req() req: any, @Param('id') id: string) {
    return this.productsService.getReviewEligibility(req.user.id, id);
  }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.productsService.getReviews(id);
  }

  @UseGuards(CustomerAuthGuard)
  @Post(':id/review-photo')
  async uploadReviewPhoto(@Req() req: any, @Param('id') id: string, @Res() reply: FastifyReply) {
    const request = reply.request as FastifyRequest & {
      file?: () => Promise<{ filename: string; mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
    };
    if (typeof request.file !== 'function') throw new BadRequestException('Multipart upload support is not available');
    const uploadedFile = await request.file();
    if (!uploadedFile) throw new BadRequestException('Review image is required');
    const buffer = await uploadedFile.toBuffer();
    return reply.send(await this.productsService.uploadReviewPhoto(req.user.id, id, {
      originalname: uploadedFile.filename,
      mimetype: uploadedFile.mimetype,
      buffer,
    }));
  }

  @UseGuards(CustomerAuthGuard)
  @Post(':id/reviews')
  createReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.productsService.createReview(req.user.id, id, dto);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/pricing')
  setPrice(@Param('id') id: string, @Body() dto: UpsertPriceDto) {
    return this.productsService.setPrice(id, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() dto: UpsertVariantDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Variant name is required');
    }
    return this.productsService.createVariant(id, { ...dto, name: dto.name });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpsertVariantDto,
  ) {
    return this.productsService.updateVariant(id, variantId, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(':id/variants/:variantId')
  removeVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.productsService.removeVariant(id, variantId);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id/inventory')
  updateInventory(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.productsService.updateInventory(id, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/media/upload')
  async uploadMedia(@Param('id') id: string, @Res() reply: FastifyReply) {
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
    if (!uploadedFile) throw new BadRequestException('Image file is required');

    const buffer = await uploadedFile.toBuffer();
    return reply.send(await this.productsService.uploadImage(id, {
      originalname: uploadedFile.filename,
      mimetype: uploadedFile.mimetype,
      buffer,
    }));
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() dto: CreateMediaDto) {
    return this.productsService.addMedia(id, dto);
  }

  @Get(':id/media/:mediaId/file')
  async getMediaFile(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Res() reply: FastifyReply,
  ) {
    const media = await this.productsService.getMediaFile(id, mediaId);

    if (/^https?:\/\//i.test(media.url)) {
      return reply.redirect(media.url);
    }

    if (media.url.startsWith('/api/assets/')) {
      const encodedKey = media.url.slice('/api/assets/'.length);
      const storageKey = encodedKey
        .split('/')
        .map((segment) => decodeURIComponent(segment))
        .join('/');

      if (!storageKey.startsWith(`products/${id}/`)) {
        throw new BadRequestException('Invalid product media path');
      }

      const buffer = await this.storage.read(storageKey);
      return new StreamableFile(buffer, {
        type: this.storage.getContentTypeForStorageKey(storageKey),
        length: buffer.length,
      });
    }

    const storageKey = media.url.replace(/^\/storage\//, '');
    const absolutePath = this.productsService.getMediaAbsolutePath(storageKey);
    const { createReadStream } = await import('node:fs');
    const stream = createReadStream(absolutePath);
    return new StreamableFile(stream, { type: 'application/octet-stream' });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(':id/media/:mediaId')
  removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.productsService.removeMedia(id, mediaId);
  }
}
