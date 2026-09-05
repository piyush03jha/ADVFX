import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CalculatePricingDto {
  @IsString()
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;
}
