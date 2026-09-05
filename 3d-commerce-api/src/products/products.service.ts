import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    await this.ensureSlugAvailable(dto.slug);

    const { stock, lowStockAt, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        inventory: {
          create: {
            stock: stock ?? 0,
            lowStockAt: lowStockAt ?? 5,
          },
        },
      },
      include: this.productInclude(),
    });
  }

  async findAll(includeArchived = false) {
    return this.prisma.product.findMany({
      where: includeArchived ? undefined : { status: { not: 'ARCHIVED' } },
      include: this.productInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.productInclude(),
    });

    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.slug) await this.ensureSlugAvailable(dto.slug, id);

    const { stock, lowStockAt, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData });

      if (stock !== undefined || lowStockAt !== undefined) {
        await tx.productInventory.upsert({
          where: { productId: id },
          create: {
            productId: id,
            stock: stock ?? 0,
            lowStockAt: lowStockAt ?? 5,
          },
          update: {
            ...(stock !== undefined ? { stock } : {}),
            ...(lowStockAt !== undefined ? { lowStockAt } : {}),
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: this.productInclude(),
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return { message: 'Product archived successfully' };
  }

  async setPrice(id: string, dto: UpsertPriceDto) {
    await this.ensureProductExists(id);

    const amountMinor = dto.amountMinor;
    const compareAtMinor = dto.compareAtMinor;

    if (compareAtMinor !== undefined && compareAtMinor < amountMinor) {
      throw new ConflictException('compareAtMinor cannot be lower than amountMinor');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productPrice.updateMany({
        where: { productId: id, isActive: true },
        data: { isActive: false },
      });

      return tx.productPrice.create({
        data: {
          productId: id,
          currency: dto.currency ?? 'INR',
          amountMinor,
          compareAtMinor,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          isActive: true,
        },
      });
    });
  }

  async updateInventory(id: string, dto: UpdateInventoryDto) {
    await this.ensureProductExists(id);

    return this.prisma.productInventory.upsert({
      where: { productId: id },
      create: {
        productId: id,
        stock: dto.stock ?? 0,
        lowStockAt: dto.lowStockAt ?? 5,
        trackStock: dto.trackStock ?? true,
        allowBackorder: dto.allowBackorder ?? false,
      },
      update: {
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.lowStockAt !== undefined ? { lowStockAt: dto.lowStockAt } : {}),
        ...(dto.trackStock !== undefined ? { trackStock: dto.trackStock } : {}),
        ...(dto.allowBackorder !== undefined ? { allowBackorder: dto.allowBackorder } : {}),
      },
    });
  }

  async addMedia(id: string, dto: CreateMediaDto) {
    await this.ensureProductExists(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productMedia.updateMany({
          where: { productId: id, type: dto.type, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.productMedia.create({
        data: {
          productId: id,
          type: dto.type,
          url: dto.url,
          altText: dto.altText,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });
  }

  async removeMedia(id: string, mediaId: string) {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId: id },
      select: { id: true },
    });

    if (!media) throw new NotFoundException(`Product media "${mediaId}" not found`);

    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    return { message: 'Product media removed successfully' };
  }

  private async ensureProductExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) throw new NotFoundException(`Product "${id}" not found`);
  }

  private async ensureSlugAvailable(slug: string, productId?: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProduct && existingProduct.id !== productId) {
      throw new ConflictException(`A product with slug "${slug}" already exists`);
    }
  }

  private productInclude(): Prisma.ProductInclude {
    return {
      category: true,
      inventory: true,
      prices: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      media: { orderBy: { sortOrder: 'asc' } },
      tags: { include: { tag: true } },
      files: true,
    };
  }
}
