import { recalculateFixedSizePrice } from '../products/fixed-size-price';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

type CategoryRef = { id: string; name: string; slug: string; parentId: string | null };

@Injectable()
export class AdminBulkService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async bulk(actorId: string|undefined, ids: string[], action: 'ARCHIVE'|'ACTIVATE'|'FEATURE'|'UNFEATURE'|'TRENDING'|'UNTRENDING') {
    const unique = [...new Set(ids.map(String).filter(Boolean))];
    const data = action==='ARCHIVE' ? {status:'ARCHIVED' as const} : action==='ACTIVATE' ? {status:'ACTIVE' as const} : action==='FEATURE' ? {isFeatured:true} : action==='UNFEATURE' ? {isFeatured:false} : action==='TRENDING' ? {isTrending:true} : {isTrending:false};
    const result = await this.prisma.product.updateMany({ where:{id:{in:unique}}, data });
    await this.audit.log({actorId,action:`PRODUCT_BULK_${action}`,entityType:'PRODUCT',summary:`${action} applied to ${result.count} products`,metadata:{ids:unique,count:result.count}});
    return { updated: result.count, requested: unique.length };
  }

  async duplicate(actorId: string|undefined, productId: string) {
    const source = await this.prisma.product.findUnique({ where:{id:productId}, include:{variants:{include:{price:true}}, prices:{where:{isActive:true,countryCode:null}}, media:{orderBy:{sortOrder:'asc'}}} });
    if (!source) throw new NotFoundException('Product not found');
    const baseSlug = source.slug+'-copy';
    let slug=baseSlug; let suffix=2;
    while(await this.prisma.product.findUnique({where:{slug},select:{id:true}})){ slug=`${baseSlug}-${suffix++}`; }
    const created = await this.prisma.$transaction(async tx=>{
      const product=await tx.product.create({data:{name:`${source.name} Copy`,slug,description:source.description,categoryId:source.categoryId,status:'DRAFT',isFeatured:false,isTrending:false,isBestseller:false,badge:source.badge,material:source.material,dimensions:source.dimensions,height:source.height,base:source.base,packaging:source.packaging,weight:source.weight,ordersEnabled:source.ordersEnabled,hasSizes:source.hasSizes,fixedWeightGrams:source.fixedWeightGrams}});
      for(const v of source.variants){await tx.productVariant.create({data:{productId:product.id,name:v.name,size:v.size,sku:null,isActive:v.isActive,price:v.price?{create:{currency:v.price.currency,amountMinor:v.price.amountMinor,compareAtMinor:v.price.compareAtMinor,isActive:true}}:undefined}})}
      for(const p of source.prices){await tx.productPrice.create({data:{productId:product.id,currency:p.currency,amountMinor:p.amountMinor,compareAtMinor:p.compareAtMinor,isActive:p.isActive,startsAt:p.startsAt,endsAt:p.endsAt}})}
      for(const m of source.media){await tx.productMedia.create({data:{productId:product.id,type:m.type,url:m.url,altText:m.altText,sortOrder:m.sortOrder,isPrimary:m.isPrimary}})}
      return product;
    });
    await this.audit.log({actorId,action:'PRODUCT_DUPLICATED',entityType:'PRODUCT',entityId:created.id,summary:`Duplicated product ${source.name}`,metadata:{sourceId:source.id}});
    return created;
  }

  async importCsv(actorId: string | undefined, csv: string, restoreArchived = false) {
    const lines = this.parseCsv(csv);
    if (lines.length < 2) throw new BadRequestException('CSV must contain a header and at least one row');
    // Normalise headers so "Sub Category", "sub_category" and "subCategory" all read as "subcategory".
    // Unnamed columns (e.g. empty price columns exported from a spreadsheet) are ignored.
    const headers = lines[0].map((h) => h.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/[\s_-]+/g, ''));
    for (const required of ['name', 'slug']) {
      if (!headers.includes(required)) throw new BadRequestException(`CSV header missing: ${required}`);
    }

    let created = 0;
    let updated = 0;
    let categoriesCreated = 0;
    const errors: string[] = [];
    const notices: string[] = [];
    const products: Array<{ id: string; name: string; slug: string; status: string; action: 'created' | 'updated'; restored: boolean }> = [];
    // Loaded once and kept in step with categories created during this import, so later rows reuse them.
    const categories: CategoryRef[] = await this.prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
    const variants = [
      { name: 'Small', size: '20 cm', header: 'smallprice' },
      { name: 'Medium', size: '25 cm', header: 'mediumprice' },
      { name: 'Large', size: '30 cm', header: 'largeprice' },
    ];

    for (let i = 1; i < lines.length; i++) {
      const row = Object.fromEntries(headers.map((header, j) => [header, (lines[i][j] ?? '').trim()])) as Record<string, string>;
      if (!row.name || !row.slug) { errors.push(`row ${i + 1}: name and slug are required`); continue; }

      try {
        const name = row.name.trim();
        const slug = row.slug.trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
        const existing = await this.prisma.product.findUnique({ where: { slug }, select: { id: true, status: true } });

        const categoryValue = row.categoryid || row.category || row.categoryslug;
        const subcategoryValue = row.subcategory || row.subcategoryslug;
        let categoryId: string | undefined;
        if (categoryValue) {
          // Main category: match by id, slug, name, or a near-identical name (e.g. "Miniatures & Table Top" ~ "Miniature Tabletop");
          // only create a new one when nothing similar exists.
          let category: CategoryRef | undefined;
          if (row.categoryid) {
            category = categories.find((c) => c.id === row.categoryid);
            if (!category) throw new Error(`category id "${categoryValue}" was not found`);
          } else {
            const found = this.findCategory(categories, categoryValue, null);
            category = found?.category;
            if (found && !found.exact) notices.push(`row ${i + 1}: category "${categoryValue}" matched existing "${found.category.name}"`);
          }
          if (!category) {
            const slug = this.uniqueCategorySlug(categories, this.slugify(categoryValue));
            const made = await this.prisma.category.create({ data: { name: categoryValue, slug }, select: { id: true } });
            category = { id: made.id, name: categoryValue, slug, parentId: null };
            categories.push(category);
            categoriesCreated++;
          }
          categoryId = category.id;

          // Subcategory: products are filed under the subcategory (the leaf) so they show in both filters.
          if (subcategoryValue) {
            if (category.parentId) throw new Error(`"${categoryValue}" is already a subcategory, so it cannot have the subcategory "${subcategoryValue}"`);
            const found = this.findCategory(categories, subcategoryValue, category.id);
            let sub = found?.category;
            if (found && !found.exact) notices.push(`row ${i + 1}: subcategory "${subcategoryValue}" matched existing "${found.category.name}"`);
            if (!sub) {
              const slug = this.uniqueCategorySlug(categories, this.slugify(subcategoryValue), category.slug);
              const made = await this.prisma.category.create({ data: { name: subcategoryValue, slug, parentId: category.id }, select: { id: true } });
              sub = { id: made.id, name: subcategoryValue, slug, parentId: category.id };
              categories.push(sub);
              categoriesCreated++;
            }
            categoryId = sub.id;
          }
        }

        const textValue = (value?: string) => value?.trim() ? value.trim() : undefined;
        const parseMoney = (value: string | undefined, label: string): number | undefined => {
          if (value === undefined || value.trim() === '') return undefined;
          const amount = Number(value.replace(/[₹,$\s]/g, ''));
          if (!Number.isFinite(amount) || amount < 0 || amount > 21474836) throw new Error(`${label} must be a valid non-negative price`);
          return Math.round(amount * 100);
        };
        const parseBoolean = (value?: string) => {
          if (value === undefined || value.trim() === '') return false;
          if (/^(true|1|yes)$/i.test(value)) return true;
          if (/^(false|0|no)$/i.test(value)) return false;
          throw new Error(`invalid boolean value "${value}"`);
        };
        const status = textValue(row.status)?.toUpperCase();
        if (status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) throw new Error('status must be DRAFT, ACTIVE, or ARCHIVED');
        // Made to order: there is no stock column. Optionally pause/resume ordering per product.
        const ordersEnabled = row.ordersenabled === undefined || row.ordersenabled.trim() === '' ? undefined : parseBoolean(row.ordersenabled);
        // Optional: false = sold without sizes at the one manual price. Blank keeps
        // the current setting (sizes on for new products).
        const hasSizes = row.hassizes === undefined || row.hassizes.trim() === '' ? undefined : parseBoolean(row.hassizes);
        const fixedWeight = textValue(row.fixedweightgrams) ? Number(row.fixedweightgrams) : undefined;
        if (fixedWeight !== undefined && !(Number.isFinite(fixedWeight) && fixedWeight > 0)) throw new Error('fixedweightgrams must be a positive number');
        // A blank status must not silently publish archived products. An explicit
        // restore request moves them to DRAFT so pricing/assets can be reviewed.
        const restored = existing?.status === 'ARCHIVED' && !status && restoreArchived;
        const effectiveStatus = status || (restored ? 'DRAFT' : undefined);
        const basePrice = parseMoney(row.price, 'price');
        const variantPrices = variants.map((variant) => ({ ...variant, amountMinor: parseMoney(row[variant.header], variant.name + ' price') ?? basePrice }));
        const imageValue = textValue(row.image || row.imageurl);
        const imageUrl = imageValue && (imageValue.toLowerCase().startsWith('https://') || imageValue.startsWith('/api/assets/')) ? imageValue : undefined;

        const imported = await this.prisma.$transaction(async (tx) => {
          let productId: string;
          if (existing) {
            const data: any = {
              name,
              ...(row.description !== undefined && row.description !== '' ? { description: row.description } : {}),
              ...(effectiveStatus ? { status: effectiveStatus } : {}),
              ...(row.isfeatured !== undefined && row.isfeatured !== '' ? { isFeatured: parseBoolean(row.isfeatured) } : {}),
              ...(row.istrending !== undefined && row.istrending !== '' ? { isTrending: parseBoolean(row.istrending) } : {}),
              ...(row.isbestseller !== undefined && row.isbestseller !== '' ? { isBestseller: parseBoolean(row.isbestseller) } : {}),
              ...(textValue(row.badge) ? { badge: textValue(row.badge) } : {}),
              ...(textValue(row.material) ? { material: textValue(row.material) } : {}),
              ...(textValue(row.dimensions) ? { dimensions: textValue(row.dimensions) } : {}),
              ...(textValue(row.height) ? { height: textValue(row.height) } : {}),
              ...(textValue(row.base) ? { base: textValue(row.base) } : {}),
              ...(textValue(row.packaging) ? { packaging: textValue(row.packaging) } : {}),
              ...(textValue(row.weight) ? { weight: textValue(row.weight) } : {}),
              ...(categoryId ? { categoryId } : {}),
              ...(ordersEnabled !== undefined ? { ordersEnabled } : {}),
              ...(hasSizes !== undefined ? { hasSizes } : {}),
              ...(fixedWeight !== undefined ? { fixedWeightGrams: fixedWeight } : {}),
            };
            await tx.product.update({ where: { id: existing.id }, data });
            productId = existing.id;
          } else {
            const product = await tx.product.create({
              data: {
                name, slug, description: textValue(row.description), status: (status || 'ACTIVE') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
                isFeatured: parseBoolean(row.isfeatured), isTrending: parseBoolean(row.istrending), isBestseller: parseBoolean(row.isbestseller),
                badge: textValue(row.badge), material: textValue(row.material), dimensions: textValue(row.dimensions),
                height: textValue(row.height), base: textValue(row.base), packaging: textValue(row.packaging), weight: textValue(row.weight), categoryId,
                ordersEnabled: ordersEnabled ?? true,
                hasSizes: hasSizes ?? true,
                fixedWeightGrams: fixedWeight,
              },
            });
            productId = product.id;
          }

          // Ensure imported products have the same editable size variants as manually created products.
          const sold = await tx.product.findUnique({ where: { id: productId }, select: { hasSizes: true, material: true, fixedWeightGrams: true } });
          for (const variant of sold?.hasSizes === false ? [] : variantPrices) {
            const current = await tx.productVariant.findFirst({ where: { productId, name: variant.name }, select: { id: true } });
            if (!current) {
              await tx.productVariant.create({
                data: {
                  productId, name: variant.name, size: variant.size,
                  price: { create: { currency: 'INR', amountMinor: variant.amountMinor ?? 0, isActive: true } },
                },
              });
            } else if (variant.amountMinor !== undefined) {
              await tx.productVariantPrice.upsert({
                where: { variantId: current.id },
                create: { variantId: current.id, currency: 'INR', amountMinor: variant.amountMinor, isActive: true },
                update: { currency: 'INR', amountMinor: variant.amountMinor, isActive: true },
              });
            }
          }

          if (sold?.hasSizes === false) {
            // No sizes: the price is calculated from weight, never typed in.
            await recalculateFixedSizePrice(tx, { id: productId, material: sold.material, fixedWeightGrams: sold.fixedWeightGrams });
          } else if (basePrice !== undefined) {
            await tx.productPrice.updateMany({ where: { productId, currency: 'INR', isActive: true, countryCode: null }, data: { isActive: false } });
            await tx.productPrice.create({ data: { productId, currency: 'INR', amountMinor: basePrice, isActive: true } });
          }
          if (imageUrl) {
            const linked = await tx.productMedia.findFirst({ where: { productId, url: imageUrl }, select: { id: true } });
            if (!linked) await tx.productMedia.create({ data: { productId, type: 'IMAGE', url: imageUrl, altText: name, sortOrder: 0, isPrimary: true } });
          }
          return { id: productId, name, slug, status: effectiveStatus || existing?.status || 'ACTIVE', action: existing ? 'updated' as const : 'created' as const, restored };
        });
        products.push(imported);
        if (imported.status === 'ARCHIVED') notices.push(`row ${i + 1}: ${name} remains archived; restore to draft or explicitly set Status to ACTIVE to publish`);
        if (existing) updated++; else created++;
        if (imageValue && !imageUrl) errors.push(`row ${i + 1}: product imported, but image "${imageValue}" is only a filename/local path; upload the image separately or provide an HTTPS or /api/assets/ URL`);
      } catch (error) {
        errors.push(`row ${i + 1}: ${error instanceof Error ? error.message : 'import failed'}`);
      }
    }

    await this.audit.log({ actorId, action: 'PRODUCT_CSV_IMPORT', entityType: 'PRODUCT', summary: `CSV import: ${created} created, ${updated} updated, ${categoriesCreated} categories created, ${errors.length} errors`, metadata: { created, updated, categoriesCreated, errors, notices, products } });
    return { created, updated, categoriesCreated, errors, notices, products };
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Category slugs are globally unique; fall back to "<parent>-<slug>" and then a counter on a clash.
  private uniqueCategorySlug(categories: CategoryRef[], base: string, parentSlug?: string): string {
    const taken = (slug: string) => categories.some((c) => c.slug === slug);
    const slug = base || 'category';
    if (!taken(slug)) return slug;
    if (parentSlug && !taken(`${parentSlug}-${slug}`)) return `${parentSlug}-${slug}`;
    for (let n = 2; ; n++) if (!taken(`${slug}-${n}`)) return `${slug}-${n}`;
  }

  /** Comparison key: ignores case, spacing, punctuation, "&"/"and", and simple plurals. */
  private categoryKey(value: string): string {
    const filler = new Set(['and', 'the', 'of', 'for', 'n']);
    return value.toLowerCase().replace(/&/g, ' ').split(/[^a-z0-9]+/)
      .filter((word) => word && !filler.has(word))
      .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
      .join('');
  }

  private editDistance(a: string, b: string): number {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[b.length];
  }

  /**
   * Finds the existing category a CSV value refers to. `parentId` null looks among main categories
   * (an exact id/slug/name hit on a subcategory is also accepted); otherwise among that parent's subcategories.
   * `exact` is false when it only matched by similar spelling, so the import can tell the admin.
   */
  private findCategory(categories: CategoryRef[], value: string, parentId: string | null): { category: CategoryRef; exact: boolean } | undefined {
    const text = value.trim();
    const lower = text.toLowerCase();
    const slug = this.slugify(text);
    const key = this.categoryKey(text);
    const pool = categories.filter((c) => (c.parentId ?? null) === parentId);
    const isExact = (c: CategoryRef) => c.id === text || c.slug === lower || c.slug === slug || c.name.trim().toLowerCase() === lower;
    const exact = pool.find(isExact) ?? (parentId === null ? categories.find(isExact) : undefined);
    if (exact) return { category: exact, exact: true };
    if (!key) return undefined;
    const sameKey = pool.find((c) => this.categoryKey(c.name) === key || this.categoryKey(c.slug) === key);
    if (sameKey) return { category: sameKey, exact: false };
    if (key.length < 6) return undefined;
    // Typos: allow roughly one wrong letter per 8, and refuse if two categories are equally close.
    const maxDistance = Math.max(1, Math.floor(key.length / 8));
    let best: CategoryRef | undefined;
    let bestDistance = Infinity;
    let tied = false;
    for (const c of pool) {
      const d = Math.min(this.editDistance(key, this.categoryKey(c.name)), this.editDistance(key, this.categoryKey(c.slug)));
      if (d < bestDistance) { best = c; bestDistance = d; tied = false; } else if (d === bestDistance) tied = true;
    }
    return best && bestDistance <= maxDistance && !tied ? { category: best, exact: false } : undefined;
  }

  private parseCsv(csv: string): string[][] {
    const input = csv.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"' && input[i + 1] === '"' && quoted) { cell += '"'; i++; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && input[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some((value) => value.trim() !== '')) rows.push(row);
        row = []; cell = ''; continue;
      }
      cell += char;
    }
    if (quoted) throw new BadRequestException('CSV contains an unclosed quoted field');
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    return rows;
  }
}
