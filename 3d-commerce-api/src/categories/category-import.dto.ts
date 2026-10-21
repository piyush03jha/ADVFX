import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CategoryImportRowDto {
  @IsString()
  category_name: string;

  @IsString()
  category_slug: string;

  @IsOptional()
  @IsString()
  subcategory_name?: string;

  @IsOptional()
  @IsString()
  subcategory_slug?: string;

  @IsOptional()
  @Type(() => Number)
  rank?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return ['true', '1', 'yes', 'active'].includes(value.trim().toLowerCase());
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}

export class CategoryImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryImportRowDto)
  rows: CategoryImportRowDto[];

  @IsOptional()
  @IsIn(['create', 'upsert'])
  mode?: 'create' | 'upsert';

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
