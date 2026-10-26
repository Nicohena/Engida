import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { setRefreshCookie } from './refresh-cookie';

const STATE_COOKIE = 'google_oauth_state';
const STATE_COOKIE_TTL_MS = 10 * 60 * 1000;

@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Start the Google Sign-In flow: the user is redirected to Google's consent
   * screen with a short-lived, signed state parameter.
   */
  @Get()
  async startGoogleAuth(
    @Query('next') next: string | undefined,
    @Res() res: Response,
  ) {
    if (!this.googleAuthService.isEnabled()) {
      this.logger.warn('Google sign-in requested but the server is not configured for it');
      return this.redirectToClient(res, '/login?error=google_not_configured');
    }

    const { state, nonce } = await this.googleAuthService.createState(next ?? '/dashboard');

    // Double-submit cookie: the callback only accepts a state that matches this
    // browser session, which blocks CSRF attempts against the callback.
    res.cookie(STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/google',
      maxAge: STATE_COOKIE_TTL_MS,
    });

    return res.redirect(this.googleAuthService.getAuthorizationUrl(state));
  }

  /**
   * Google redirects back here with the authorization code.
   */
  @Get('callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.warn(`Google sign-in was not completed: ${error}`);
      return this.redirectToClient(res, `/login?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return this.redirectToClient(res, '/login?error=google_invalid_response');
    }

    // The intended destination is only trusted once the signed state verified.
    let resolvedNext: string | null = null;

    try {
      const nonce = req.cookies?.[STATE_COOKIE];
      const statePayload = await this.googleAuthService.verifyState(state, nonce);
      resolvedNext = statePayload.next;
      const profile = await this.googleAuthService.verifyCode(code);

      // A browser that is already signed in may link this Google identity to
      // the account it owns. Without a session, an existing local account with
      // the same email is never linked automatically.
      const sessionUser = await this.authService.findUserByRefreshToken(
        req.cookies?.refreshToken,
      );

      const result = await this.authService.loginWithGoogle(
        profile,
        req.headers['user-agent'],
        req.ip,
        sessionUser?.id,
      );

      setRefreshCookie(res, result.refreshToken, this.configService);

      // The access token is never put in the URL. The frontend exchanges the
      // HttpOnly refresh cookie for an access token on the callback page.
      res.clearCookie(STATE_COOKIE, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        path: '/auth/google',
      });

      return this.redirectToClient(
        res,
        `/auth/google/callback?next=${encodeURIComponent(statePayload.next)}`,
      );
    } catch (err) {
      this.logger.warn(`Google sign-in failed: ${(err as Error).message}`);

      // Only our own, user-safe messages are shown to the browser. Everything
      // else (provider errors, network issues) is logged server-side only.
      const reason =
        err instanceof UnauthorizedException || err instanceof ConflictException
          ? err.message
          : 'google_failed';

      // Send the user back to the page they started from (e.g. the host
      // gateway) so the error is shown in the right context.
      const target = resolvedNext ?? '/login';
      return this.redirectToClient(res, withQueryParam(target, 'error', reason));
    }
  }

  private redirectToClient(res: Response, path: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const target = `${frontendUrl.replace(/\/$/, '')}${path}`;
    return res.redirect(target);
  }
}

/**
 * Append a query parameter to an internal path, keeping existing parameters.
 */
function withQueryParam(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}
