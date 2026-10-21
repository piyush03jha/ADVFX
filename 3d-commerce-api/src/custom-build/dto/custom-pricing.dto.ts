import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CustomPricingDto {
  @IsString()
  @IsIn(["person", "pet", "object", "vehicle", "character", "other"])
  category: string;

  @IsOptional()
  @IsString()
  @IsIn(["half", "full"])
  bodyType?: string;

  @IsOptional()
  @IsString()
  @IsIn(["bobble", "stationary"])
  headType?: string;

  @IsOptional()
  @IsString()
  @IsIn(["single", "couple", "pet", "group"])
  subjectType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  personCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  petCount?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(1000)
  sizeCm: number;
}