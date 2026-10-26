import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, UserRole } from '../../../users/entities/user.entity';
import {
  ALL_PERMISSIONS,
  Permission,
  getAdminPermissions,
  hasAnyPermission,
  hasPermission,
} from './permissions';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';

describe('Admin RBAC permissions', () => {
  it('returns no permissions for guests and non-admin accounts', () => {
    expect(getAdminPermissions(null)).toEqual([]);
    expect(
      getAdminPermissions({ role: UserRole.USER, adminRole: null }),
    ).toEqual([]);
    expect(
      getAdminPermissions({
        role: UserRole.USER,
        adminRole: AdminRole.SUPER_ADMIN,
      }),
    ).toEqual([]);
  });

  it('treats a legacy admin without an adminRole as a Super Admin', () => {
    expect(
      getAdminPermissions({ role: UserRole.ADMIN, adminRole: null }),
    ).toEqual(ALL_PERMISSIONS);
  });

  it('grants Super Admins the complete permission catalog', () => {
    expect(
      getAdminPermissions({
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
      }),
    ).toEqual(ALL_PERMISSIONS);
  });

  it('limits property moderators to trust and moderation workflows', () => {
    const permissions = getAdminPermissions({
      role: UserRole.ADMIN,
      adminRole: AdminRole.PROPERTY_MODERATOR,
    });

    expect(permissions).toEqual(
      expect.arrayContaining([
        Permission.REVIEWS_MODERATE,
        Permission.LISTINGS_REVIEW,
        Permission.HOSTS_VERIFY,
        Permission.REPORTS_RESOLVE,
      ]),
    );
    expect(permissions).not.toContain(Permission.USERS_MANAGE);
    expect(permissions).not.toContain(Permission.ADMINS_MANAGE);
    expect(permissions).not.toContain(Permission.AUDIT_VIEW);
  });

  it('gives support agents account and report access without listing powers', () => {
    const permissions = getAdminPermissions({
      role: UserRole.ADMIN,
      adminRole: AdminRole.SUPPORT_AGENT,
    });

    expect(permissions).toEqual(
      expect.arrayContaining([
        Permission.USERS_VIEW,
        Permission.USERS_MANAGE,
        Permission.REPORTS_RESOLVE,
      ]),
    );
    expect(permissions).not.toContain(Permission.LISTINGS_REVIEW);
    expect(permissions).not.toContain(Permission.REVIEWS_MODERATE);
    expect(permissions).not.toContain(Permission.ADMINS_MANAGE);
    expect(permissions).not.toContain(Permission.AUDIT_VIEW);
  });

  it('keeps booking managers read-only until phase two permissions exist', () => {
    const permissions = getAdminPermissions({
      role: UserRole.ADMIN,
      adminRole: AdminRole.BOOKING_MANAGER,
    });

    expect(permissions).toEqual(
      expect.arrayContaining([
        Permission.DASHBOARD_VIEW,
        Permission.USERS_VIEW,
        Permission.REPORTS_VIEW,
      ]),
    );
    expect(permissions).not.toContain(Permission.USERS_MANAGE);
    expect(permissions).not.toContain(Permission.REPORTS_RESOLVE);
  });

  it('gives finance managers audit access without moderation powers', () => {
    const permissions = getAdminPermissions({
      role: UserRole.ADMIN,
      adminRole: AdminRole.FINANCE_MANAGER,
    });

    expect(permissions).toContain(Permission.AUDIT_VIEW);
    expect(permissions).not.toContain(Permission.REPORTS_VIEW);
    expect(permissions).not.toContain(Permission.REVIEWS_MODERATE);
  });

  it('supports single and any-of permission checks', () => {
    const support = {
      role: UserRole.ADMIN,
      adminRole: AdminRole.SUPPORT_AGENT,
    };

    expect(hasPermission(support, Permission.USERS_VIEW)).toBe(true);
    expect(hasPermission(support, Permission.AUDIT_VIEW)).toBe(false);
    expect(
      hasAnyPermission(support, [
        Permission.AUDIT_VIEW,
        Permission.REPORTS_VIEW,
      ]),
    ).toBe(true);
    expect(
      hasAnyPermission(support, [
        Permission.AUDIT_VIEW,
        Permission.LISTINGS_REVIEW,
      ]),
    ).toBe(false);
  });

  describe('PermissionsGuard', () => {
    const createContext = (user?: {
      role: UserRole;
      adminRole: AdminRole | null;
    }) =>
      ({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as any;

    it('allows handlers without permission metadata', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(undefined),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('allows an administrator with the required permission', () => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([Permission.USERS_VIEW]),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      expect(
        guard.canActivate(
          createContext({
            role: UserRole.ADMIN,
            adminRole: AdminRole.SUPPORT_AGENT,
          }),
        ),
      ).toBe(true);
    });

    it('rejects an administrator missing a required permission', () => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([Permission.AUDIT_VIEW]),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      expect(() =>
        guard.canActivate(
          createContext({
            role: UserRole.ADMIN,
            adminRole: AdminRole.SUPPORT_AGENT,
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('rejects non-admin accounts even if permissions are requested', () => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([Permission.USERS_VIEW]),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      expect(() =>
        guard.canActivate(
          createContext({ role: UserRole.USER, adminRole: null }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('uses the permission metadata key on guarded handlers', () => {
      expect(PERMISSIONS_KEY).toBe('admin_permissions');
    });
  });
});
