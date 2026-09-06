import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEmailService } from './email.service';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
