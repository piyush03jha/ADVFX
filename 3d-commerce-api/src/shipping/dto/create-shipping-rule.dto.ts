import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ShippingRuleType } from '@prisma/client';

export class CreateShippingRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ShippingRuleType)
  type: ShippingRuleType;

  @ValidateIf((o) => o.type === ShippingRuleType.FLAT_RATE)
  @IsInt()
  @Min(0)
  amountMinor?: number;

  @ValidateIf((o) => o.type === ShippingRuleType.FREE_ABOVE)
  @IsInt()
  @Min(0)
  freeAboveMinor?: number;

  @ValidateIf((o) => o.type === ShippingRuleType.WEIGHT_BASED)
  @IsInt()
  @Min(0)
  minWeightGrams?: number;

  @ValidateIf((o) => o.type === ShippingRuleType.WEIGHT_BASED)
  @IsInt()
  @Min(0)
  maxWeightGrams?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  estimatedMaxDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
