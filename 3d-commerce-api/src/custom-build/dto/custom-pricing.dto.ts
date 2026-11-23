import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class CustomPricingDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "category must be a valid category slug" })
  @MaxLength(40)
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
  @IsInt()
  @Min(5)
  @Max(1000)
  sizeCm: number;
}