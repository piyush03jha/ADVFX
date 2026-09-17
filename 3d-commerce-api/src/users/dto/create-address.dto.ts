import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
