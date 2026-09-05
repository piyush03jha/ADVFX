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
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateCustomRequestDto } from './dto/create-custom-request.dto';
import { SetCustomPreviewDto } from './dto/set-custom-preview.dto';
import { UpdateCustomRequestStatusDto } from './dto/update-custom-request-status.dto';
import { CustomBuildService } from './custom-build.service';

@UseGuards(AuthGuard)
@Controller('custom-requests')
export class CustomBuildController {
  constructor(private readonly customBuildService: CustomBuildService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCustomRequestDto) {
    return this.customBuildService.create(req.user.id, dto);
  }

  @Get()
  mine(@Req() req: any) {
    return this.customBuildService.mine(req.user.id);
  }

  @Get(':id')
  mineOne(@Req() req: any, @Param('id') id: string) {
    return this.customBuildService.mineOne(req.user.id, id);
  }

  @Post(':id/approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.customBuildService.approve(req.user.id, id);
  }

  @Post(':id/add-to-cart')
  addToCart(@Req() req: any, @Param('id') id: string) {
    return this.customBuildService.addToCart(req.user.id, id);
  }

  @Post(':id/revision')
  requestRevision(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.customBuildService.requestRevision(req.user.id, id, note);
  }

  @UseGuards(AdminGuard)
  @Get('admin/list')
  adminList(@Query('status') status?: CustomRequestStatus) {
    return this.customBuildService.findAllAdmin(status);
  }

  @UseGuards(AdminGuard)
  @Get('admin/:id')
  adminOne(@Param('id') id: string) {
    return this.customBuildService.findOneAdmin(id);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRequestStatusDto,
  ) {
    return this.customBuildService.updateStatus(id, dto.status);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/preview')
  setPreview(
    @Param('id') id: string,
    @Body() dto: SetCustomPreviewDto,
  ) {
    return this.customBuildService.upsertPreview(id, dto.url);
  }
}
