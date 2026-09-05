import { Body, Controller, Post, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.secret);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    return this.authService.logout(token);
  }
}
