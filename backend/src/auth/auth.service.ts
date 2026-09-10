import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; user: Partial<User> }> {
    const { name, email, password, role } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await this.usersService.createUser({
      name,
      email,
      passwordHash,
      role: role || UserRole.USER,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshTokens(
    refreshTokenRaw: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens = await this.refreshTokenRepository.find({
      relations: { user: true },
    });

    let matchedTokenRecord: RefreshToken | null = null;

    for (const record of tokens) {
      const isMatch = await bcrypt.compare(refreshTokenRaw, record.tokenHash);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (matchedTokenRecord.isRevoked) {
      this.logger.warn(
        `Revoked refresh token reuse attempt detected for user: ${matchedTokenRecord.userId}`,
      );
      await this.refreshTokenRepository.update(
        { userId: matchedTokenRecord.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    if (new Date() > new Date(matchedTokenRecord.expiresAt)) {
      matchedTokenRecord.isRevoked = true;
      await this.refreshTokenRepository.save(matchedTokenRecord);
      throw new UnauthorizedException('Refresh token has expired. Please login again.');
    }

    const user = matchedTokenRecord.user;
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account inactive');
    }

    const newTokens = await this.generateTokens(user, userAgent, ipAddress);

    matchedTokenRecord.isRevoked = true;
    matchedTokenRecord.replacedByToken = newTokens.refreshToken.substring(0, 16);
    await this.refreshTokenRepository.save(matchedTokenRecord);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  async logout(refreshTokenRaw?: string): Promise<{ message: string }> {
    if (!refreshTokenRaw) {
      return { message: 'Logged out successfully' };
    }

    const tokens = await this.refreshTokenRepository.find({
      where: { isRevoked: false },
    });

    for (const record of tokens) {
      const isMatch = await bcrypt.compare(refreshTokenRaw, record.tokenHash);
      if (isMatch) {
        record.isRevoked = true;
        await this.refreshTokenRepository.save(record);
        break;
      }
    }

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessTokenSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'super_secret_jwt_access_key_change_in_production_12345!',
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: accessTokenSecret,
    });

    const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(refreshTokenRaw, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 15 * 60,
    };
  }
}
