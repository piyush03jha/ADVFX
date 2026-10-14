import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class GoogleLoginDto {
  /** One-time authorization code returned by Google to the frontend callback. */
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code!: string;

  /** PKCE verifier generated before redirecting to Google (RFC 7636). */
  @IsString()
  @MinLength(43)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9\-._~]+$/, { message: 'codeVerifier has an invalid format.' })
  codeVerifier!: string;
}
