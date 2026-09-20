import { BadRequestException, Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthCaptchaService } from './captcha.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly captchaService: AuthCaptchaService) {}

  @Get('captcha')
  captcha(@Query('purpose') purpose?: string) {
    if (purpose !== 'login' && purpose !== 'register') throw new BadRequestException('A valid CAPTCHA purpose is required.');
    return this.captchaService.issue(purpose);
  }

  @Post('register')
  registerCustomer(@Body() dto: CustomerRegisterDto) {
    return this.authService.registerCustomer(dto.name, dto.email, dto.password, dto.captchaToken, dto.captchaAnswer);
  }

  @Post('login')
  loginCustomer(@Body() dto: CustomerLoginDto) {
    return this.authService.customerLogin(dto.email, dto.password, dto.captchaToken, dto.captchaAnswer);
  }

  @Get('session')
  session(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    return this.authService.authenticateCustomer(token);
  }

  @Post('customer/logout')
  logoutCustomer(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    return this.authService.customerLogout(token);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyCustomerEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendCustomerVerification(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotCustomerPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetCustomerPassword(dto.token, dto.password);
  }

  @Post('admin/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(AuthGuard)
  @Get('admin/session')
  adminSession(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    return this.authService.authenticate(token);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    return this.authService.logout(token);
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) return '';
    return authorization.slice('Bearer '.length).trim();
  }
}
