import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';

/**
 * Legacy host/property/booking routes grant an "admin override" whenever
 * `user.role === ADMIN`. Granular admin roles must not inherit that power just
 * because they can enter the console, so only Super Admins keep the override.
 *
 * The request user is a per-request entity loaded by JwtStrategy; changing its
 * in-memory role here does not update the database or the admin console routes.
 */
@Injectable()
export class SuperAdminBypassGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      return true;
    }

    const isSuperAdmin =
      !user.adminRole || user.adminRole === AdminRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      user.role = UserRole.USER;
    }

    return true;
  }
}
