import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  captchaToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  captchaAnswer?: string;
}
