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
    const source = await this.prisma.product.findUnique({ where:{id:productId}, include:{variants:{include:{price:true}}, prices:{where:{isActive:true}}, media:{orderBy:{sortOrder:'asc'}}} });
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

  async importCsv(actorId: string|undefined, csv: string) {
    const lines=this.parseCsv(csv); if(lines.length<2) throw new BadRequestException('CSV must contain a header and at least one row');
    const headers=lines[0].map(h=>h.trim().toLowerCase());
    const required=['name','slug']; for(const h of required) if(!headers.includes(h)) throw new BadRequestException(`CSV header missing: ${h}`);
    let created=0,updated=0; const errors:string[]=[];
    for(let i=1;i<lines.length;i++){
      const row=Object.fromEntries(headers.map((h,j)=>[h,lines[i][j]??'']));
      if(!row.name||!row.slug){errors.push(`row ${i+1}: name and slug are required`);continue;}
      try{
        const existing=await this.prisma.product.findUnique({where:{slug:row.slug},select:{id:true}});
        const data:any={name:row.name.trim(),description:row.description?.trim()||undefined,status:['DRAFT','ACTIVE','ARCHIVED'].includes(row.status)?row.status:'DRAFT',isFeatured:row.isfeatured==='true',isTrending:row.istrending==='true',badge:row.badge?.trim()||undefined,material:row.material?.trim()||undefined,scale:row.scale?.trim()||undefined,dimensions:row.dimensions?.trim()||undefined,height:row.height?.trim()||undefined,base:row.base?.trim()||undefined,packaging:row.packaging?.trim()||undefined,weight:row.weight?.trim()||undefined};
        if(existing){await this.prisma.product.update({where:{id:existing.id},data});updated++;}else{await this.prisma.product.create({data:{...data,slug:row.slug.trim(),inventory:{create:{stock:Number(row.stock)||0}}}});created++;}
      }catch(e){errors.push(`row ${i+1}: ${e instanceof Error?e.message:'import failed'}`)}
    }
    await this.audit.log({actorId,action:'PRODUCT_CSV_IMPORT',entityType:'PRODUCT',summary:`CSV import: ${created} created, ${updated} updated, ${errors.length} errors`,metadata:{created,updated,errors}});
    return {created,updated,errors};
  }

  private parseCsv(csv:string): string[][] {
    const rows:string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
    for(let i=0;i<csv.length;i++){const c=csv[i]; if(c==='"' && csv[i+1]==='"' && quoted){cell+='"';i++;continue;} if(c==='"'){quoted=!quoted;continue;} if(c===','&&!quoted){row.push(cell);cell='';continue;} if((c==='\\n'||c==='\\r')&&!quoted){if(c==='\\r'&&csv[i+1]==='\\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';continue;} cell+=c;} row.push(cell);if(row.some(Boolean))rows.push(row);return rows;
  }
}
