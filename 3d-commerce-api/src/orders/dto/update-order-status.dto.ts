import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsBoolean()
  codCollected?: boolean;

  @IsEnum(OrderStatus)
  status: OrderStatus;
}
