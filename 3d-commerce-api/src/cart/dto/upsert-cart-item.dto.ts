import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class UpsertCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
