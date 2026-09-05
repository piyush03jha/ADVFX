import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  requirements: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dimensions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredMaterial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredScale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  referenceFileCount?: number;
}
