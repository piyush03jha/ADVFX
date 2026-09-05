import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class AdminOrderListDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
