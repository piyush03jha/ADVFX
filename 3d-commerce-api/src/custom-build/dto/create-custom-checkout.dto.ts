import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCustomCheckoutDto {
  @IsString()
  @IsNotEmpty()
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}