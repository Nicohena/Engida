import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { getAdminPermissions } from '../modules/admin/rbac/permissions';
import { setRefreshCookie, clearRefreshCookie } from './refresh-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }

  @Get('otp/status')
  getOtpProviderStatus() {
    return this.otpService.getProviderStatus();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.login(loginDto, userAgent, ipAddress);

    setRefreshCookie(res, result.refreshToken, this.configService);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken, userAgent, ipAddress);

    setRefreshCookie(res, result.refreshToken, this.configService);

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(refreshToken);

    clearRefreshCookie(res, this.configService);

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole || null,
      permissions: getAdminPermissions(user),
      avatar: user.avatar || null,
      createdAt: user.createdAt,
      hostProfile: user.hostProfile || null,
    };
  }
}
