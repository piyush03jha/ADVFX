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
  @IsString() @IsIn(["body","head","frame","size"]) section: string;
  @IsString() slug: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsNumber() multiplier?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCustomBuildOptionDto { @IsOptional() @IsIn(["body","head","frame","size"]) section?: string; @IsOptional() @IsString() slug?: string; @IsOptional() @IsString() name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsInt() @Min(0) priceMinor?: number; @IsOptional() @IsNumber() multiplier?: number; @IsOptional() @IsInt() sortOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; }
