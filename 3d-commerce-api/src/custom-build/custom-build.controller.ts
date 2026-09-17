import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CustomRequestStatus } from '@prisma/client';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { CreateCustomRequestDto } from './dto/create-custom-request.dto';
import { SetCustomPreviewDto } from './dto/set-custom-preview.dto';
import { UpdateCustomRequestStatusDto } from './dto/update-custom-request-status.dto';
import { CustomBuildService } from './custom-build.service';

@Controller('custom-requests')
export class CustomBuildController {
  constructor(private readonly customBuildService: CustomBuildService) {}

  @UseGuards(CustomerAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateCustomRequestDto) {
    return this.customBuildService.create(req.user.id, dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Get()
  mine(@Req() req: any) {
    return this.customBuildService.mine(req.user.id);
  }

  @UseGuards(CustomerAuthGuard)
  @Get(':id')
  mineOne(@Req() req: any, @Param('id') id: string) {
    return this.customBuildService.mineOne(req.user.id, id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/list')
  adminList(@Query('status') status?: CustomRequestStatus) {
    return this.customBuildService.findAllAdmin(status);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/:id')
  adminOne(@Param('id') id: string) {
    return this.customBuildService.findOneAdmin(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRequestStatusDto,
  ) {
    return this.customBuildService.updateStatus(id, dto.status);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/:id/preview')
  setPreview(
    @Param('id') id: string,
    @Body() dto: SetCustomPreviewDto,
  ) {
    return this.customBuildService.upsertPreview(id, dto.url);
  }
}
