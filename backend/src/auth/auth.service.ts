import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserRole, AuthProvider } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './google-auth.service';
import { getAdminPermissions } from '../modules/admin/rbac/permissions';

export interface AuthSessionUser extends Partial<User> {
  permissions?: string[];
}

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
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; user: Partial<User> }> {
    const { name, email, password } = registerDto;

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
      role: UserRole.USER,
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
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthSessionUser }> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
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
        adminRole: user.adminRole || null,
        permissions: getAdminPermissions(user),
        avatar: user.avatar || null,
        createdAt: user.createdAt,
        hostProfile: user.hostProfile || undefined,
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

  /**
   * Sign in (or sign up) with a verified Google identity.
   *
   * - Known Google account   -> the existing account is signed in
   * - Unknown Google account -> a new account is created
   * - Existing local account -> the Google identity is linked to it, but only
   *   when the request already carries a valid session for that same account.
   *   Local accounts have no email verification, so linking on the email alone
   *   would allow an attacker to take over an account they only registered.
   */
  async loginWithGoogle(
    profile: GoogleProfile,
    userAgent?: string,
    ipAddress?: string,
    sessionUserId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthSessionUser;
    created: boolean;
  }> {
    const email = profile.email.toLowerCase().trim();
    let user = await this.usersService.findByProvider(AuthProvider.GOOGLE, profile.providerId);
    let created = false;

    if (!user) {
      const existing = await this.usersService.findByEmail(email);

      if (existing) {
        if (
          existing.authProvider === AuthProvider.GOOGLE &&
          existing.providerId &&
          existing.providerId !== profile.providerId
        ) {
          throw new ConflictException(
            'This email address is already linked to a different Google account',
          );
        }

        if (!sessionUserId || sessionUserId !== existing.id) {
          throw new ConflictException(
            'An account with this email already exists. Please sign in with your password first, then use "Continue with Google" to link it.',
          );
        }

        user = await this.usersService.linkProvider(
          existing.id,
          AuthProvider.GOOGLE,
          profile.providerId,
        );
        this.logger.log(`Linked Google identity to existing account ${existing.id}`);
      } else {
        user = await this.usersService.createUser({
          name: profile.name,
          email,
          passwordHash: null,
          role: UserRole.USER,
          authProvider: AuthProvider.GOOGLE,
          providerId: profile.providerId,
          avatar: profile.picture ?? null,
        });
        created = true;
        this.logger.log(`Created account ${user.id} from Google sign-in`);
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Fill in profile details Google knows about but we do not have yet.
    const profileUpdates: { name?: string; avatar?: string } = {};
    if (!user.name && profile.name) profileUpdates.name = profile.name;
    if (!user.avatar && profile.picture) profileUpdates.avatar = profile.picture;
    if (Object.keys(profileUpdates).length > 0) {
      user = await this.usersService.updateProfileFields(user.id, profileUpdates);
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
        adminRole: user.adminRole || null,
        permissions: getAdminPermissions(user),
        createdAt: user.createdAt,
        avatar: user.avatar || null,
        hostProfile: user.hostProfile || undefined,
      },
      created,
    };
  }

  /**
   * Resolve the account behind a raw refresh token without rotating it.
   * Used to prove that the browser already owns an account before a Google
   * identity is linked to it.
   */
  async findUserByRefreshToken(refreshTokenRaw?: string): Promise<User | null> {
    if (!refreshTokenRaw) return null;

    const tokens = await this.refreshTokenRepository.find({
      where: { isRevoked: false },
      relations: { user: true },
    });

    for (const record of tokens) {
      const isMatch = await bcrypt.compare(refreshTokenRaw, record.tokenHash);
      if (!isMatch) continue;

      if (new Date() > new Date(record.expiresAt)) return null;

      const user = record.user;
      if (!user || !user.isActive) return null;

      return user;
    }

    return null;
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

    const accessToken = this.jwtService.sign(payload);

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
