import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEmailService } from './email.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { AuthCaptchaService } from './captcha.service';
import { GoogleOAuthService } from './google-oauth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, AuthCaptchaService, GoogleOAuthService, AuthGuard, CustomerAuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, CustomerAuthGuard, AdminGuard],
})
export class AuthModule {}
