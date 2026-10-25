import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

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
    const source = await this.prisma.product.findUnique({ where:{id:productId}, include:{inventory:true,variants:{include:{price:true}}, prices:{where:{isActive:true}}, media:{orderBy:{sortOrder:'asc'}}} });
    if (!source) throw new NotFoundException('Product not found');
    const baseSlug = source.slug+'-copy';
    let slug=baseSlug; let suffix=2;
    while(await this.prisma.product.findUnique({where:{slug},select:{id:true}})){ slug=`${baseSlug}-${suffix++}`; }
    const created = await this.prisma.$transaction(async tx=>{
      const product=await tx.product.create({data:{name:`${source.name} Copy`,slug,description:source.description,categoryId:source.categoryId,status:'DRAFT',isFeatured:false,isTrending:false,isBestseller:false,badge:source.badge,material:source.material,scale:source.scale,dimensions:source.dimensions,height:source.height,base:source.base,packaging:source.packaging,weight:source.weight,inventory:{create:{stock:0,reserved:0,lowStockAt:source.inventory?.lowStockAt??5,trackStock:source.inventory?.trackStock??true,allowBackorder:source.inventory?.allowBackorder??false}}}});
      for(const v of source.variants){await tx.productVariant.create({data:{productId:product.id,name:v.name,size:v.size,sku:null,isActive:v.isActive,stock:0,reserved:0,lowStockAt:v.lowStockAt,trackStock:v.trackStock,allowBackorder:v.allowBackorder,price:v.price?{create:{currency:v.price.currency,amountMinor:v.price.amountMinor,compareAtMinor:v.price.compareAtMinor,isActive:true}}:undefined}})}
      for(const p of source.prices){await tx.productPrice.create({data:{productId:product.id,currency:p.currency,amountMinor:p.amountMinor,compareAtMinor:p.compareAtMinor,isActive:p.isActive,startsAt:p.startsAt,endsAt:p.endsAt}})}
      for(const m of source.media){await tx.productMedia.create({data:{productId:product.id,type:m.type,url:m.url,altText:m.altText,sortOrder:m.sortOrder,isPrimary:m.isPrimary}})}
      return product;
    });
    await this.audit.log({actorId,action:'PRODUCT_DUPLICATED',entityType:'PRODUCT',entityId:created.id,summary:`Duplicated product ${source.name}`,metadata:{sourceId:source.id}});
    return created;
  }

  async importCsv(actorId: string | undefined, csv: string) {
    const lines = this.parseCsv(csv);
    if (lines.length < 2) throw new BadRequestException('CSV must contain a header and at least one row');
    const headers = lines[0].map((h) => h.trim().replace(/^\uFEFF/, '').toLowerCase());
    for (const required of ['name', 'slug']) {
      if (!headers.includes(required)) throw new BadRequestException(`CSV header missing: ${required}`);
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const variants = [
      { name: 'Small', size: '15 cm', header: 'smallprice' },
      { name: 'Medium', size: '20 cm', header: 'mediumprice' },
      { name: 'Large', size: '25 cm', header: 'largeprice' },
    ];

    for (let i = 1; i < lines.length; i++) {
      const row = Object.fromEntries(headers.map((header, j) => [header, (lines[i][j] ?? '').trim()])) as Record<string, string>;
      if (!row.name || !row.slug) { errors.push(`row ${i + 1}: name and slug are required`); continue; }

      try {
        const name = row.name.trim();
        const slug = row.slug.trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
        const existing = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });

        const categoryValue = row.categoryid || row.category || row.categoryslug;
        let categoryId: string | undefined;
        if (categoryValue) {
          const category = await this.prisma.category.findFirst({
            where: { OR: [
              { id: categoryValue },
              { slug: categoryValue.toLowerCase() },
              { name: { equals: categoryValue, mode: 'insensitive' } },
            ] },
            select: { id: true },
          });
          if (!category) throw new Error(`category "${categoryValue}" was not found; use an existing category name or slug`);
          categoryId = category.id;
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
        const stock = row.stock === undefined || row.stock === '' ? undefined : Number(row.stock);
        if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) throw new Error('stock must be a non-negative whole number');
        const basePrice = parseMoney(row.price, 'price');
        const variantPrices = variants.map((variant) => ({ ...variant, amountMinor: parseMoney(row[variant.header], variant.name + ' price') ?? basePrice }));
        const imageValue = textValue(row.image || row.imageurl);
        const imageUrl = imageValue && (/^https:\/\/\//i.test(imageValue) || imageValue.startsWith('/api/assets/')) ? imageValue : undefined;

        await this.prisma.$transaction(async (tx) => {
          let productId: string;
          if (existing) {
            const data: any = {
              name,
              ...(row.description !== undefined && row.description !== '' ? { description: row.description } : {}),
              ...(status ? { status } : {}),
              ...(row.isfeatured !== undefined && row.isfeatured !== '' ? { isFeatured: parseBoolean(row.isfeatured) } : {}),
              ...(row.istrending !== undefined && row.istrending !== '' ? { isTrending: parseBoolean(row.istrending) } : {}),
              ...(row.isbestseller !== undefined && row.isbestseller !== '' ? { isBestseller: parseBoolean(row.isbestseller) } : {}),
              ...(textValue(row.badge) ? { badge: textValue(row.badge) } : {}),
              ...(textValue(row.material) ? { material: textValue(row.material) } : {}),
              ...(textValue(row.scale) ? { scale: textValue(row.scale) } : {}),
              ...(textValue(row.dimensions) ? { dimensions: textValue(row.dimensions) } : {}),
              ...(textValue(row.height) ? { height: textValue(row.height) } : {}),
              ...(textValue(row.base) ? { base: textValue(row.base) } : {}),
              ...(textValue(row.packaging) ? { packaging: textValue(row.packaging) } : {}),
              ...(textValue(row.weight) ? { weight: textValue(row.weight) } : {}),
              ...(categoryId ? { categoryId } : {}),
            };
            await tx.product.update({ where: { id: existing.id }, data });
            productId = existing.id;
            if (stock !== undefined) {
              await tx.productInventory.upsert({ where: { productId }, create: { productId, stock }, update: { stock } });
            }
          } else {
            const product = await tx.product.create({
              data: {
                name, slug, description: textValue(row.description), status: (status || 'ACTIVE') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
                isFeatured: parseBoolean(row.isfeatured), isTrending: parseBoolean(row.istrending), isBestseller: parseBoolean(row.isbestseller),
                badge: textValue(row.badge), material: textValue(row.material), scale: textValue(row.scale), dimensions: textValue(row.dimensions),
                height: textValue(row.height), base: textValue(row.base), packaging: textValue(row.packaging), weight: textValue(row.weight), categoryId,
                inventory: { create: { stock: stock ?? 0 } },
              },
            });
            productId = product.id;
          }

          // Ensure imported products have the same editable size variants as manually created products.
          for (const variant of variantPrices) {
            const current = await tx.productVariant.findFirst({ where: { productId, name: variant.name }, select: { id: true } });
            if (!current) {
              await tx.productVariant.create({
                data: {
                  productId, name: variant.name, size: variant.size, stock: stock ?? 0, reserved: 0,
                  lowStockAt: 5, trackStock: true, allowBackorder: false,
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

          if (basePrice !== undefined) {
            await tx.productPrice.updateMany({ where: { productId, currency: 'INR', isActive: true }, data: { isActive: false } });
            await tx.productPrice.create({ data: { productId, currency: 'INR', amountMinor: basePrice, isActive: true } });
          }
          if (imageUrl) {
            const linked = await tx.productMedia.findFirst({ where: { productId, url: imageUrl }, select: { id: true } });
            if (!linked) await tx.productMedia.create({ data: { productId, type: 'IMAGE', url: imageUrl, altText: name, sortOrder: 0, isPrimary: true } });
          }
        });
        if (existing) updated++; else created++;
        if (imageValue && !imageUrl) errors.push(`row ${i + 1}: product imported, but image "${imageValue}" is only a filename/local path; upload the image separately or provide an HTTPS or /api/assets/ URL`);
      } catch (error) {
        errors.push(`row ${i + 1}: ${error instanceof Error ? error.message : 'import failed'}`);
      }
    }

    await this.audit.log({ actorId, action: 'PRODUCT_CSV_IMPORT', entityType: 'PRODUCT', summary: `CSV import: ${created} created, ${updated} updated, ${errors.length} errors`, metadata: { created, updated, errors } });
    return { created, updated, errors };
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
