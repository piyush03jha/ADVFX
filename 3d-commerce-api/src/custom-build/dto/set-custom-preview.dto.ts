import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetCustomPreviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;
}
