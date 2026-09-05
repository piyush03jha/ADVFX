import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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
}
