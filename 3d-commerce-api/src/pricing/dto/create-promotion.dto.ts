import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(64) code?: string;
  @IsEnum(PromotionType) type: PromotionType;
  @IsInt() @Min(1) @Max(10000) value: number;
  @IsOptional() @IsInt() @Min(0) minSubtotalMinor?: number;
  @IsOptional() @IsInt() @Min(0) maxDiscountMinor?: number;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
