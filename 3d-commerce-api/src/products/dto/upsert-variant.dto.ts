import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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
  weightGrams?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number | null;

  /**
   * Manual selling price for this size in rupees (GST inclusive).
   * A number sets the override, null clears it and goes back to the
   * calculated price, undefined leaves it unchanged.
   */
  @IsNumber()
  @Min(0)
  @Max(21474836)
  @IsOptional()
  priceOverride?: number | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
