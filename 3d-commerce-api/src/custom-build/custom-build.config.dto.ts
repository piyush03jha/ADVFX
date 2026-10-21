import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateCustomBuildCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) basePriceMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateCustomBuildOptionDto {
  @IsString() @IsIn(["body","head","frame"]) section: string;
  @IsString() slug: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsNumber() multiplier?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCustomBuildOptionDto { @IsOptional() @IsIn(["body","head","frame"]) section?: string; @IsOptional() @IsString() slug?: string; @IsOptional() @IsString() name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsInt() @Min(0) priceMinor?: number; @IsOptional() @IsNumber() multiplier?: number; @IsOptional() @IsInt() sortOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; }


export class CreateCustomBuildHeightRangeDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0.1) @Max(1000) minCm: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0.1) @Max(1000) maxCm: number;
  @IsInt() @Min(0) priceMinor: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCustomBuildHeightRangeDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0.1) @Max(1000) minCm?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0.1) @Max(1000) maxCm?: number;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
