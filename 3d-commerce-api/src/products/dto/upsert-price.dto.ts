import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertPriceDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsInt()
  @Min(0)
  amountMinor: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtMinor?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
