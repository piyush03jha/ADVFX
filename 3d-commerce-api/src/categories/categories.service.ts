import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { StorageService } from '../storage/storage.service';
import sharp from 'sharp';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug: dto.slug }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException('Category name or slug already exists');
    }

    return this.prisma.category.create({
      data: dto,
    });
  }

  /**
   * Product counts must only include products that really exist for the
   * audience: the storefront sees ACTIVE products, admins see everything that
   * has not been archived (archiving is how products are "deleted").
   */
  private productCountSelect(activeOnly: boolean) {
    return {
      _count: {
        select: {
          products: {
            where: activeOnly
              ? { status: 'ACTIVE' as const }
              : { status: { not: 'ARCHIVED' as const } },
          },
        },
      },
    };
  }

  async findAll(includeInactive = false) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: this.productCountSelect(!includeInactive),
    });

    return categories.map((category) => ({
      ...category,
      imageUrl: this.canonicalCategoryImageUrl(category.imageUrl),
    }));
  }

  async findOne(id: string, activeProductsOnly = true) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.productCountSelect(activeProductsOnly),
    });

    if (!category) {
      throw new NotFoundException(`Category "${id}" not found`);
    }

    return {
      ...category,
      imageUrl: this.canonicalCategoryImageUrl(category.imageUrl),
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug || dto.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.slug ? [{ slug: dto.slug }] : []),
            ...(dto.name ? [{ name: dto.name }] : []),
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException('Category name or slug already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async uploadImage(id: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    const category = await this.findOne(id);

    const maxBytes = Math.min(Number(process.env.MAX_CATEGORY_IMAGE_MB ?? 5), 10) * 1024 * 1024;
    if (!file.buffer?.length) throw new BadRequestException('Uploaded image is empty');
    if (file.buffer.length > maxBytes) {
      throw new BadRequestException(`Image exceeds the maximum size of ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }

    const extension = file.originalname.toLowerCase().split('.').pop() ?? '';
    const allowed = new Set(['jpg', 'jpeg', 'png', 'webp']);
    if (!allowed.has(extension)) throw new BadRequestException('Only JPG, PNG and WebP images are supported');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid image MIME type');
    }

    try {
      await sharp(file.buffer).metadata();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid image');
    }

    const stored = await this.storage.saveCategoryImage(id, file.originalname, file.buffer);

    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: { imageUrl: stored.storageUrl },
      });

      const oldKey = this.storageKeyFromImageUrl(category.imageUrl);
      if (oldKey && oldKey !== stored.storageKey) {
        try { await this.storage.delete(oldKey); } catch { /* preserve successful update */ }
      }

      return {
        ...updated,
        imageUrl: this.canonicalCategoryImageUrl(updated.imageUrl),
      };
    } catch (error) {
      try { await this.storage.delete(stored.storageKey); } catch { /* preserve database error */ }
      throw error;
    }
  }

  private canonicalCategoryImageUrl(url?: string | null): string | null {
    const key = this.storageKeyFromImageUrl(url);
    return key?.startsWith("categories/")
      ? this.storage.getPublicAssetUrl(key)
      : null;
  }

  private storageKeyFromImageUrl(url?: string | null): string | null {
    if (!url) return null;

    const raw = url.trim();
    if (!raw) return null;

    try {
      const parsed = new URL(raw, "https://voxel3d.org");
      let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");

      const prefixes = ["api/assets/", "assets/", "storage/"];
      for (const prefix of prefixes) {
        if (pathname.startsWith(prefix)) {
          pathname = pathname.slice(prefix.length);
          break;
        }
      }

      // B2/S3 URLs include the bucket name before the storage key.
      const bucket = process.env.STORAGE_BUCKET?.trim();
      if (bucket && pathname.startsWith(bucket + "/")) {
        pathname = pathname.slice(bucket.length + 1);
      }

      return pathname.startsWith("categories/") ? pathname : null;
    } catch {
      return null;
    }
  }

  async remove(id: string) {
    // Count every non-archived product so a category that still holds draft or
    // live products is deactivated instead of deleted.
    const category = await this.findOne(id, false);

    if (category._count.products > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
