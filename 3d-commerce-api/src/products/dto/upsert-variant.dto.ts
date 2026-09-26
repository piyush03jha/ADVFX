import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertVariantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  size?: string | null;

  @IsString()
  @IsOptional()
  sku?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockAt?: number;

  @IsBoolean()
  @IsOptional()
  trackStock?: boolean;

  @IsBoolean()
  @IsOptional()
  allowBackorder?: boolean;
}
