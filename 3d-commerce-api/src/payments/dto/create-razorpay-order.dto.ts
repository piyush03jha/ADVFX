import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
