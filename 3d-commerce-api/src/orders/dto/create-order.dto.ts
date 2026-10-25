import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  Max,
  MaxLength,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  variantId?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

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