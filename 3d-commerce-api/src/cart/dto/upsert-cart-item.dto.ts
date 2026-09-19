import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  variantId?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
