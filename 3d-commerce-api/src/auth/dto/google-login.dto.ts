import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code!: string;

  @IsString()
  @MinLength(43)
  @MaxLength(128)
  codeVerifier!: string;
}
