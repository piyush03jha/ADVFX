import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockAt?: number;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;
}
