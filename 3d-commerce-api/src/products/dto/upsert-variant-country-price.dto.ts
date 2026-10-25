import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class UpsertVariantCountryPriceDto {
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsInt()
  @Min(0)
  amountMinor: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtMinor?: number | null;
}
