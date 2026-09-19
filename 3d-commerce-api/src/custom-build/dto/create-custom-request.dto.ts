import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCustomRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  requirements: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dimensions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredMaterial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredScale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

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

  @IsInt()
  @IsIn([8, 12, 15, 20, 25, 30])
  sizeCm: number;
}
