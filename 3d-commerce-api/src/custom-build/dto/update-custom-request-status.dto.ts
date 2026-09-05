import { IsEnum } from 'class-validator';
import { CustomRequestStatus } from '@prisma/client';

export class UpdateCustomRequestStatusDto {
  @IsEnum(CustomRequestStatus)
  status: CustomRequestStatus;
}
