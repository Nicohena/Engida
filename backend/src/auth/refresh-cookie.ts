import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sameSite = configService.get<string>('COOKIE_SAME_SITE', 'lax') as
    | 'lax'
    | 'strict'
    | 'none';
  const secure =
    configService.get<string>('COOKIE_SECURE') === 'true' ||
    (isProduction && sameSite !== 'none');

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/auth',
    maxAge: ONE_WEEK_MS,
  });
}

export function clearRefreshCookie(res: Response, configService: ConfigService): void {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sameSite = configService.get<string>('COOKIE_SAME_SITE', 'lax') as
    | 'lax'
    | 'strict'
    | 'none';
  const secure =
    configService.get<string>('COOKIE_SECURE') === 'true' ||
    (isProduction && sameSite !== 'none');

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/auth',
  });
}
