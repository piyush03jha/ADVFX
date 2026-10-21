import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Boolean)
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
