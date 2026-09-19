import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { CreateCustomRequestDto } from "./create-custom-request.dto";

export class CreateCustomCheckoutDto extends CreateCustomRequestDto {
  @IsString()
  @IsNotEmpty()
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}