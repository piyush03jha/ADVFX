import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductMediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsEnum(ProductMediaType)
  type: ProductMediaType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
