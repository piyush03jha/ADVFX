import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UsersService } from './users.service';

@UseGuards(AuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('users/me')
  updateMe(@Req() req: any, @Body() body: { name?: string; phone?: string }) {
    return this.usersService.updateMe(req.user.id, body);
  }

  @Get('addresses')
  listAddresses(@Req() req: any) {
    return this.usersService.listAddresses(req.user.id);
  }

  @Post('addresses')
  createAddress(@Req() req: any, @Body() body: any) {
    return this.usersService.createAddress(req.user.id, body);
  }

  @Patch('addresses/:id')
  updateAddress(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.usersService.updateAddress(req.user.id, id, body);
  }

  @Delete('addresses/:id')
  deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deleteAddress(req.user.id, id);
  }
}
