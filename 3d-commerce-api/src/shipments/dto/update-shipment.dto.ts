import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentDto {
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  trackingUrl?: string;
}
