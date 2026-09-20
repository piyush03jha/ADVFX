import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CustomerLoginDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  captchaToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  captchaAnswer?: string;
}
