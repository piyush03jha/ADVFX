import { Type } from 'class-transformer';
import {
  IsArray,
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
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

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
  @IsArray()
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