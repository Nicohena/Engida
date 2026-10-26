import { Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';

export interface GoogleProfile {
  /** Google `sub` claim - stable, unique per Google account. */
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export interface GoogleStatePayload {
  /** Internal path the user should land on after a successful sign-in. */
  next: string;
  /** Random value echoed through the browser and compared with the state cookie. */
  nonce: string;
}

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];
const STATE_TTL_SECONDS = 10 * 60;
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Wraps the Google OpenID Connect flow:
 *  - builds the consent URL
 *  - exchanges the authorization code for tokens
 *  - verifies the identity token (signature, audience, issuer, expiry)
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private client: OAuth2Client | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  get clientId(): string | null {
    return this.configService.get<string>('GOOGLE_CLIENT_ID') || null;
  }

  get clientSecret(): string | null {
    return this.configService.get<string>('GOOGLE_CLIENT_SECRET') || null;
  }

  get callbackUrl(): string {
    const explicit = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    if (explicit) return explicit;

    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    return `${backendUrl.replace(/\/$/, '')}/auth/google/callback`;
  }

  /**
   * Optional restriction to a single Google Workspace domain.
   */
  get allowedHostedDomain(): string | null {
    const domain = this.configService.get<string>('GOOGLE_ALLOWED_HOSTED_DOMAIN');
    return domain ? domain.trim().toLowerCase() : null;
  }

  isEnabled(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Only allow internal paths so the callback can never be used as an open redirect.
   */
  sanitizeReturnPath(value: unknown, fallback = '/dashboard'): string {
    if (typeof value !== 'string') return fallback;
    if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
      return fallback;
    }
    return value;
  }

  async createState(nextPath: string): Promise<{ state: string; nonce: string }> {
    const nonce = crypto.randomBytes(24).toString('hex');
    const payload: GoogleStatePayload = {
      next: this.sanitizeReturnPath(nextPath),
      nonce,
    };

    const state = await this.jwtService.signAsync(payload, {
      expiresIn: STATE_TTL_SECONDS,
    });

    return { state, nonce };
  }

  async verifyState(state: string, expectedNonce?: string): Promise<GoogleStatePayload> {
    let payload: GoogleStatePayload;
    try {
      payload = await this.jwtService.verifyAsync<GoogleStatePayload>(state);
    } catch {
      throw new UnauthorizedException('Google sign-in state is invalid or has expired');
    }

    if (!payload?.nonce) {
      throw new UnauthorizedException('Google sign-in state is malformed');
    }

    if (expectedNonce && payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('Google sign-in state does not match this browser session');
    }

    return {
      next: this.sanitizeReturnPath(payload.next),
      nonce: payload.nonce,
    };
  }

  getAuthorizationUrl(state: string): string {
    const client = this.getClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      state,
      prompt: 'select_account',
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange the authorization code and return a verified Google profile.
   */
  async verifyCode(code: string): Promise<GoogleProfile> {
    const client = this.getClient();
    const { tokens } = await client.getToken(code);

    let profile: GoogleProfile | null = null;

    if (tokens.id_token) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: this.clientId as string,
        });
        const payload = ticket.getPayload();
        if (payload) {
          profile = {
            providerId: payload.sub as string,
            email: (payload.email as string) || '',
            emailVerified: payload.email_verified === true,
            name: (payload.name as string) || (payload.email as string) || 'Engida Guest',
            picture: payload.picture as string | undefined,
          };
        }
      } catch (error) {
        this.logger.warn(`Google id_token verification failed: ${(error as Error).message}`);
      }
    }

    if (!profile && tokens.access_token) {
      profile = await this.fetchUserInfo(tokens.access_token);
    }

    if (!profile) {
      throw new UnauthorizedException('Google did not return a verifiable identity');
    }

    if (!profile.providerId) {
      throw new UnauthorizedException('Google did not return an account identifier');
    }

    if (!profile.email) {
      throw new UnauthorizedException('Your Google account does not expose an email address');
    }

    if (!profile.emailVerified) {
      throw new UnauthorizedException('Your Google email address is not verified');
    }

    const allowedDomain = this.allowedHostedDomain;
    if (allowedDomain && !profile.email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      throw new UnauthorizedException(`Only ${allowedDomain} accounts may sign in`);
    }

    return profile;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleProfile | null> {
    try {
      const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        this.logger.warn(`Google userinfo request failed with status ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      if (!data?.sub) return null;

      return {
        providerId: data.sub,
        email: data.email || '',
        emailVerified: data.email_verified === true,
        name: data.name || data.email || 'Engida Guest',
        picture: data.picture,
      };
    } catch (error) {
      this.logger.warn(`Google userinfo request error: ${(error as Error).message}`);
      return null;
    }
  }

  private getClient(): OAuth2Client {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
      );
    }

    if (!this.client) {
      this.client = new OAuth2Client(
        this.clientId as string,
        this.clientSecret as string,
        this.callbackUrl,
      );
    }

    return this.client;
  }
}
