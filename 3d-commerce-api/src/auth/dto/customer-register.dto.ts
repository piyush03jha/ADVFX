import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CustomerRegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  captchaToken!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2)
  captchaAnswer!: string;
}
