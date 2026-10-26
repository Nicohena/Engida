import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type CookieSameSite = 'lax' | 'strict' | 'none';

function parseSameSite(raw?: string): CookieSameSite {
  const normalized = (raw || '').toLowerCase().trim();
  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }
  return 'lax';
}

function getRefreshCookieBaseOptions(configService: ConfigService): CookieOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sameSite = parseSameSite(configService.get<string>('COOKIE_SAME_SITE'));
  const explicitSecure = configService.get<string>('COOKIE_SECURE') === 'true';

  // SameSite=none cookies MUST be secure, otherwise browsers reject them (RFC 6265bis)
  const secure = explicitSecure || sameSite === 'none' || isProduction;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/auth',
  };
}

/**
 * The refresh token is stored in an HttpOnly cookie so it is never readable by
 * JavaScript. It is scoped to the auth routes and mirrored in the response body
 * for clients that cannot use cookies.
 */
export function setRefreshCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  res.cookie('refreshToken', token, {
    ...getRefreshCookieBaseOptions(configService),
    maxAge: ONE_WEEK_MS,
  });
}

export function clearRefreshCookie(res: Response, configService: ConfigService): void {
  res.clearCookie('refreshToken', getRefreshCookieBaseOptions(configService));
}
