import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  const mockConfig = {
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
    BACKEND_URL: 'http://localhost:3000',
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) =>
      key in mockConfig ? (mockConfig as any)[key] : defaultValue,
    ),
  };

  const mockOAuthClient = {
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    getToken: jest.fn(),
    verifyIdToken: jest.fn(),
  };

  const googlePayload = {
    sub: 'google-sub-123',
    email: 'guest@example.com',
    email_verified: true,
    name: 'Guest User',
    picture: 'https://lh3.googleusercontent.com/a/avatar',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
      ],
    }).compile();

    service = module.get<GoogleAuthService>(GoogleAuthService);
    // Inject the OAuth client so no network call is made.
    (service as any).client = mockOAuthClient;
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('is enabled when a client id and secret are configured', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('is disabled when the client secret is missing', () => {
      (mockConfig as any).GOOGLE_CLIENT_SECRET = '';
      jest.spyOn(mockConfigService, 'get').mockImplementation((key: string, defaultValue?: any) =>
        key in mockConfig ? (mockConfig as any)[key] : defaultValue,
      );

      expect(service.isEnabled()).toBe(false);
      (mockConfig as any).GOOGLE_CLIENT_SECRET = 'test-client-secret';
    });
  });

  describe('return path sanitisation', () => {
    it('keeps internal paths', () => {
      expect(service.sanitizeReturnPath('/host/dashboard')).toBe('/host/dashboard');
    });

    it('rejects absolute and protocol relative urls', () => {
      expect(service.sanitizeReturnPath('https://evil.example.com')).toBe('/dashboard');
      expect(service.sanitizeReturnPath('//evil.example.com')).toBe('/dashboard');
      expect(service.sanitizeReturnPath('/\\evil.example.com')).toBe('/dashboard');
    });
  });

  describe('state handling', () => {
    it('creates a signed state that can be verified', async () => {
      const { state, nonce } = await service.createState('/host/dashboard');

      expect(typeof state).toBe('string');
      expect(nonce).toHaveLength(48);

      const payload = await service.verifyState(state, nonce);
      expect(payload.next).toBe('/host/dashboard');
      expect(payload.nonce).toBe(nonce);
    });

    it('rejects a state that was not signed by this server', async () => {
      await expect(service.verifyState('not-a-jwt', 'nonce')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a state that does not match the browser session cookie', async () => {
      const { state } = await service.createState('/dashboard');

      await expect(service.verifyState(state, 'a-different-nonce')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('stores only internal paths inside the state', async () => {
      const { state, nonce } = await service.createState('https://evil.example.com');

      const payload = await service.verifyState(state, nonce);
      expect(payload.next).toBe('/dashboard');
    });
  });

  describe('authorization url', () => {
    it('requests the openid scopes and carries the state', () => {
      const url = service.getAuthorizationUrl('state-token');

      expect(mockOAuthClient.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: ['openid', 'email', 'profile'],
          state: 'state-token',
        }),
      );
      expect(url).toContain('accounts.google.com');
    });
  });

  describe('code verification', () => {
    beforeEach(() => {
      mockOAuthClient.getToken.mockResolvedValue({
        tokens: {
          id_token: 'id-token',
          access_token: 'access-token',
        },
      });
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
    });

    it('returns the verified google profile', async () => {
      const profile = await service.verifyCode('auth-code');

      expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ idToken: 'id-token' }),
      );
      expect(profile).toEqual({
        providerId: 'google-sub-123',
        email: 'guest@example.com',
        emailVerified: true,
        name: 'Guest User',
        picture: 'https://lh3.googleusercontent.com/a/avatar',
      });
    });

    it('rejects accounts whose email is not verified', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email_verified: false }),
      });

      await expect(service.verifyCode('auth-code')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects accounts without an email address', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email: undefined }),
      });

      await expect(service.verifyCode('auth-code')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects accounts outside the allowed hosted domain', async () => {
      (mockConfig as any).GOOGLE_ALLOWED_HOSTED_DOMAIN = 'engida.com';
      jest.spyOn(mockConfigService, 'get').mockImplementation((key: string, defaultValue?: any) =>
        key in mockConfig ? (mockConfig as any)[key] : defaultValue,
      );

      await expect(service.verifyCode('auth-code')).rejects.toThrow(UnauthorizedException);

      delete (mockConfig as any).GOOGLE_ALLOWED_HOSTED_DOMAIN;
    });
  });
});
