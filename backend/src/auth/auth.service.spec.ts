import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole, AuthProvider } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2b$12$e/a/somehash',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    findByProvider: jest.fn(),
    linkProvider: jest.fn(),
    updateProfileFields: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_access_token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'token-uuid', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.message).toBe('User registered successfully');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject accounts that only have a Google identity', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(
        authService.login({ email: 'test@example.com', password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findUserByRefreshToken', () => {
    it('returns the user behind a valid refresh token', async () => {
      mockRefreshTokenRepository.find.mockResolvedValueOnce([
        {
          tokenHash: 'hashed',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 60_000),
          user: mockUser,
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const user = await authService.findUserByRefreshToken('raw-token');

      expect(user?.id).toBe(mockUser.id);
    });

    it('returns null when the token does not match', async () => {
      mockRefreshTokenRepository.find.mockResolvedValueOnce([]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      expect(await authService.findUserByRefreshToken('raw-token')).toBeNull();
    });

    it('returns null for an expired token', async () => {
      mockRefreshTokenRepository.find.mockResolvedValueOnce([
        {
          tokenHash: 'hashed',
          isRevoked: false,
          expiresAt: new Date(Date.now() - 60_000),
          user: mockUser,
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      expect(await authService.findUserByRefreshToken('raw-token')).toBeNull();
    });

    it('returns null when no token is supplied', async () => {
      expect(await authService.findUserByRefreshToken(undefined)).toBeNull();
    });
  });

  describe('loginWithGoogle', () => {
    const googleProfile = {
      providerId: 'google-sub-123',
      email: 'guest@example.com',
      emailVerified: true,
      name: 'Guest User',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    };

    const googleUser = {
      ...mockUser,
      email: 'guest@example.com',
      authProvider: AuthProvider.GOOGLE,
      providerId: 'google-sub-123',
      avatar: 'https://lh3.googleusercontent.com/a/avatar',
    };

    it('should sign in an account that is already linked to Google', async () => {
      mockUsersService.findByProvider.mockResolvedValue(googleUser);

      const result = await authService.loginWithGoogle(googleProfile);

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.user.email).toBe('guest@example.com');
      expect(result.created).toBe(false);
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
      expect(mockUsersService.linkProvider).not.toHaveBeenCalled();
    });

    it('should create an account for an unknown Google identity', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue({
        ...googleUser,
        name: googleProfile.name,
      });

      const result = await authService.loginWithGoogle(googleProfile);

      expect(result.created).toBe(true);
      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'guest@example.com',
          passwordHash: null,
          authProvider: AuthProvider.GOOGLE,
          providerId: 'google-sub-123',
          role: UserRole.USER,
        }),
      );
    });

    it('should link an existing local account to the Google identity', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'guest@example.com',
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      });
      mockUsersService.linkProvider.mockResolvedValue(googleUser);

      const result = await authService.loginWithGoogle(
        googleProfile,
        undefined,
        undefined,
        mockUser.id,
      );

      expect(result.created).toBe(false);
      expect(mockUsersService.linkProvider).toHaveBeenCalledWith(
        mockUser.id,
        AuthProvider.GOOGLE,
        'google-sub-123',
      );
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });

    it('should refuse to link a local account without an existing session', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'guest@example.com',
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      });

      await expect(authService.loginWithGoogle(googleProfile)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.linkProvider).not.toHaveBeenCalled();
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });

    it('should refuse to link a local account owned by another session', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'guest@example.com',
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      });

      await expect(
        authService.loginWithGoogle(googleProfile, undefined, undefined, 'a-different-user-id'),
      ).rejects.toThrow(ConflictException);
      expect(mockUsersService.linkProvider).not.toHaveBeenCalled();
    });

    it('should reject an email that is linked to a different Google account', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'guest@example.com',
        authProvider: AuthProvider.GOOGLE,
        providerId: 'another-google-sub',
      });

      await expect(authService.loginWithGoogle(googleProfile)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject disabled accounts', async () => {
      mockUsersService.findByProvider.mockResolvedValue({ ...googleUser, isActive: false });

      await expect(authService.loginWithGoogle(googleProfile)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

