import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTaxRuleDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @MaxLength(2) countryCode: string;
  @IsOptional() @IsString() @MaxLength(32) stateCode?: string;
  @IsInt() @Min(0) @Max(10000) rateBps: number;
  @IsOptional() @IsBoolean() applyToShipping?: boolean;
  @IsOptional() @IsInt() @Min(0) priority?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
