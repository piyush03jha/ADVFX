import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  couponCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotedSubtotalMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotedShippingMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotedDiscountMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotedTaxMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotedTotalMinor?: number;

  @IsOptional()
  @IsString()
  quotedCurrency?: string;
}