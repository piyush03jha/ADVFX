import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReturnRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
