import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { StorageService } from '../storage/storage.service';
import { CategoryImportDto } from './category-import.dto';
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

    const parentId = dto.parentId?.trim() || null;
    if (parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId) throw new BadRequestException('Subcategories cannot have their own subcategories');
    }

    return this.prisma.category.create({
      data: { ...dto, parentId },
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
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { ...this.productCountSelect(!includeInactive), parent: { select: { id: true, name: true, slug: true } }, children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: this.productCountSelect(!includeInactive) } },
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
    const current = await this.findOne(id);
    if (dto.parentId !== undefined) {
      const parentId = dto.parentId?.trim() || null;
      if (parentId === id) throw new BadRequestException('A category cannot be its own parent');
      if (parentId) {
        const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
        if (!parent) throw new NotFoundException('Parent category not found');
        if (parent.parentId) throw new BadRequestException('Subcategories cannot have their own subcategories');
      }
      if (parentId && current.parentId) {
        // Keep the hierarchy to exactly two levels.
      }
      if (parentId) {
        const currentChildren = await this.prisma.category.count({ where: { parentId: id } });
        if (currentChildren > 0) {
          throw new BadRequestException('A category with subcategories cannot become a subcategory');
        }
      }
    }

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

    const { parentId, ...data } = dto;
    return this.prisma.category.update({
      where: { id },
      data: { ...data, ...(parentId !== undefined ? { parentId: parentId?.trim() || null } : {}) },
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

  
  async importCategories(input: CategoryImportDto) {
    const rows = input.rows ?? [];
    if (!rows.length) throw new BadRequestException('The import file has no data rows');
    if (rows.length > 2000) throw new BadRequestException('A maximum of 2,000 spreadsheet rows can be imported at a time');

    type Normalized = {
      categoryName: string;
      categorySlug: string;
      subName: string | null;
      subSlug: string | null;
      categoryRank: number;
      subRank: number;
      description: string | null;
      active: boolean;
      rowNumber: number;
    };
    const normalized: Normalized[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const seenCategorySlugs = new Map<string, { row: number; name: string }>();
    const seenChildSlugs = new Map<string, number>();
    const seenPairs = new Map<string, number>();
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const categoryName = String(row.category_name ?? '').trim();
      const categorySlug = String(row.category_slug ?? '').trim().toLowerCase();
      const subName = String(row.subcategory_name ?? '').trim() || null;
      const subSlug = String(row.subcategory_slug ?? '').trim().toLowerCase() || null;
      const rankValue = row.rank;
      const commonRank = rankValue === undefined || rankValue === null ? index : Number(rankValue);
      const categoryRank = row.category_rank === undefined || row.category_rank === null ? commonRank : Number(row.category_rank);
      const subRank = row.subcategory_rank === undefined || row.subcategory_rank === null ? commonRank : Number(row.subcategory_rank);
      const active = row.is_active === undefined ? true : Boolean(row.is_active);
      if (!categoryName) errors.push({ row: rowNumber, message: 'category_name is required' });
      if (!slugPattern.test(categorySlug)) errors.push({ row: rowNumber, message: 'category_slug must be lowercase letters/numbers separated by hyphens' });
      if (!Number.isInteger(categoryRank) || categoryRank < 0) errors.push({ row: rowNumber, message: 'category_rank/rank must be a non-negative whole number' });
      if (subSlug && (!Number.isInteger(subRank) || subRank < 0)) errors.push({ row: rowNumber, message: 'subcategory_rank/rank must be a non-negative whole number' });
      if (Boolean(subName) !== Boolean(subSlug)) errors.push({ row: rowNumber, message: 'subcategory_name and subcategory_slug must both be filled or both blank' });
      if (subSlug && !slugPattern.test(subSlug)) errors.push({ row: rowNumber, message: 'subcategory_slug is invalid' });

      const previousCategory = seenCategorySlugs.get(categorySlug);
      if (previousCategory && previousCategory.name !== categoryName) {
        errors.push({ row: rowNumber, message: `category slug "${categorySlug}" has conflicting names (first seen on row ${previousCategory.row})` });
      } else if (!previousCategory) {
        seenCategorySlugs.set(categorySlug, { row: rowNumber, name: categoryName });
      }

      const key = categorySlug + '|' + (subSlug ?? '');
      if (seenPairs.has(key)) errors.push({ row: rowNumber, message: `duplicate category/subcategory pair; first seen on row ${seenPairs.get(key)}` });
      else seenPairs.set(key, rowNumber);

      if (subSlug) {
        const previousChild = seenChildSlugs.get(subSlug);
        if (previousChild) errors.push({ row: rowNumber, message: `duplicate subcategory slug "${subSlug}" within file; first seen on row ${previousChild}` });
        else seenChildSlugs.set(subSlug, rowNumber);
      }
      normalized.push({
        categoryName, categorySlug, subName, subSlug,
        categoryRank, subRank,
        description: String(row.description ?? '').trim() || null,
        active, rowNumber,
      });
    });
    for (const [slug, info] of seenCategorySlugs) {
      const childRow = seenChildSlugs.get(slug);
      if (childRow) errors.push({ row: childRow, message: `slug "${slug}" cannot be both a main category and a subcategory` });
    }
    if (errors.length) return { ok: false, dryRun: input.dryRun !== false, errors, summary: { rows: rows.length, errors: errors.length } };

    const mode = input.mode ?? 'upsert';
    const existing = await this.prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true, children: { select: { id: true } } },
    });
    const bySlug = new Map(existing.map((category) => [category.slug, category]));
    const categorySlugs = new Set(normalized.map((row) => row.categorySlug));
    const childSlugs = new Set(normalized.map((row) => row.subSlug).filter((slug): slug is string => Boolean(slug)));
    const toCreateSlugs = new Set<string>();
    const toUpdateSlugs = new Set<string>();
    for (const row of normalized) {
      for (const item of [
        { slug: row.categorySlug, name: row.categoryName },
        ...(row.subSlug && row.subName ? [{ slug: row.subSlug, name: row.subName }] : []),
      ]) {
        const found = bySlug.get(item.slug);
        if (found) {
          if (mode === 'create') errors.push({ row: row.rowNumber, message: `slug "${item.slug}" already exists` });
          else toUpdateSlugs.add(item.slug);
        } else toCreateSlugs.add(item.slug);
      }
      const foundParent = bySlug.get(row.categorySlug);
      if (foundParent?.parentId) errors.push({ row: row.rowNumber, message: `"${row.categorySlug}" already exists as a subcategory; it cannot be a parent` });
      if (row.subSlug) {
        const foundChild = bySlug.get(row.subSlug);
        if (foundChild && foundChild.children.length) {
          errors.push({ row: row.rowNumber, message: `"${row.subSlug}" already has subcategories and cannot be moved under another category` });
        }
        if (foundChild?.parentId && foundParent && foundChild.parentId !== foundParent.id && mode === 'create') {
          errors.push({ row: row.rowNumber, message: `"${row.subSlug}" is already assigned to a different parent` });
        }
        if (foundChild && !foundChild.parentId && mode === 'create') {
          errors.push({ row: row.rowNumber, message: `"${row.subSlug}" already exists as a main category` });
        }
      }
    }
    // A child slug cannot collide with a main category slug in this file.
    for (const slug of childSlugs) {
      if (categorySlugs.has(slug)) {
        const row = normalized.find((item) => item.subSlug === slug);
        errors.push({ row: row?.rowNumber ?? 2, message: `slug "${slug}" cannot be both a main category and a subcategory` });
      }
    }
    if (errors.length) return { ok: false, dryRun: input.dryRun !== false, errors, summary: { rows: rows.length, errors: errors.length } };

    const preview = {
      rows: rows.length,
      uniqueCategories: new Set(normalized.map((row) => row.categorySlug)).size,
      subcategories: new Set(normalized.map((row) => row.subSlug).filter((slug): slug is string => Boolean(slug))).size,
      creates: toCreateSlugs.size,
      updates: toUpdateSlugs.size,
      mode,
    };
    if (input.dryRun !== false) return { ok: true, dryRun: true, summary: preview, errors: [] };

    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      const parentCache = new Map<string, string>();
      for (const row of normalized) {
        let parentId = parentCache.get(row.categorySlug);
        if (!parentId) {
          const existedParent = bySlug.has(row.categorySlug);
          const parent = await tx.category.upsert({
            where: { slug: row.categorySlug },
            create: { name: row.categoryName, slug: row.categorySlug, sortOrder: row.categoryRank, description: row.description, isActive: row.active, parentId: null },
            update: mode === 'upsert' ? { name: row.categoryName, sortOrder: row.categoryRank, description: row.description, isActive: row.active, parentId: null } : {},
          });
          parentId = parent.id;
          parentCache.set(row.categorySlug, parentId);
          if (existedParent && mode === 'upsert') updated += 1;
          else if (!existedParent) created += 1;
          bySlug.set(parent.slug, { id: parent.id, name: parent.name, slug: parent.slug, parentId: null, children: [] });
        }
        if (row.subSlug && row.subName) {
          const previous = await tx.category.findUnique({ where: { slug: row.subSlug }, select: { id: true, parentId: true } });
          const child = await tx.category.upsert({
            where: { slug: row.subSlug },
            create: { name: row.subName, slug: row.subSlug, parentId, sortOrder: row.subRank, description: null, isActive: row.active },
            update: mode === 'upsert' ? { name: row.subName, parentId, sortOrder: row.subRank, isActive: row.active } : {},
          });
          if (previous && mode === 'upsert') updated += 1;
          else if (!previous) created += 1;
          bySlug.set(child.slug, { id: child.id, name: child.name, slug: child.slug, parentId, children: [] });
        }
      }
      return { created, updated };
    }, { maxWait: 10000, timeout: 60000 });
    return { ok: true, dryRun: false, summary: { ...preview, ...result }, errors: [] };
  }

  async remove(id: string) {
    // Count every non-archived product so a category that still holds draft or
    // live products is deactivated instead of deleted.
    const category = await this.findOne(id, false);

    const childCount = await this.prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException('Move or remove subcategories before deleting this category');
    }

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
