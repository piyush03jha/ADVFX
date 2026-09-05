import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CheckoutQuoteDto {
  @IsString()
  @IsNotEmpty()
  shippingAddressId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  couponCode?: string;
}