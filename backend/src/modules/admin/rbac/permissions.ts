import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';

/**
 * Stable permission keys used by backend guards and the admin frontend.
 * Keep these values in sync with `frontend/src/types/admin.ts`.
 */
export enum Permission {
  DASHBOARD_VIEW = 'admin.dashboard.view',
  USERS_VIEW = 'users.view',
  USERS_MANAGE = 'users.manage',
  ADMINS_MANAGE = 'admins.manage',
  HOSTS_VIEW = 'hosts.view',
  HOSTS_VERIFY = 'hosts.verify',
  LISTINGS_VIEW = 'listings.view',
  LISTINGS_REVIEW = 'listings.review',
  LISTINGS_HIDE = 'listings.hide',
  REVIEWS_VIEW = 'reviews.view',
  REVIEWS_MODERATE = 'reviews.moderate',
  REPORTS_VIEW = 'reports.view',
  REPORTS_RESOLVE = 'reports.resolve',
  BOOKINGS_VIEW = 'bookings.view',
  BOOKINGS_MANAGE = 'bookings.manage',
  CASES_VIEW = 'cases.view',
  CASES_MANAGE = 'cases.manage',
  CASES_COMPENSATE = 'cases.compensate',
  AUDIT_VIEW = 'audit.view',
  FINANCE_VIEW = 'finance.view',
  FINANCE_REFUNDS = 'finance.refunds',
  FINANCE_PAYOUTS = 'finance.payouts',
  FINANCE_RECONCILE = 'finance.reconcile',
  FINANCE_CONFIG = 'finance.config',
  FINANCE_EXPORT = 'finance.export',
  CATALOG_MANAGE = 'catalog.manage',
  COUPONS_MANAGE = 'coupons.manage',
  CONTENT_MANAGE = 'content.manage',
  ANALYTICS_VIEW = 'analytics.view',
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_MANAGE = 'settings.manage',
  SYSTEM_VIEW = 'system.view',
  SYSTEM_MANAGE = 'system.manage',
}

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

/**
 * Role -> permission map for the fixed MVP role set.
 *
 * Phase 1 is deliberately code-defined: roles are stable and permission changes
 * go through code review. Phase 2 adds the booking and case permissions here.
 * Phase 3 adds complete finance and escrow operations permissions.
 * Phase 4 adds catalog, growth, and content permissions.
 */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: ALL_PERMISSIONS,

  [AdminRole.PROPERTY_MODERATOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW,
    Permission.HOSTS_VIEW,
    Permission.HOSTS_VERIFY,
    Permission.LISTINGS_VIEW,
    Permission.LISTINGS_REVIEW,
    Permission.LISTINGS_HIDE,
    Permission.REVIEWS_VIEW,
    Permission.REVIEWS_MODERATE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_RESOLVE,
    Permission.CATALOG_MANAGE,
    Permission.CONTENT_MANAGE,
    Permission.ANALYTICS_VIEW,
  ],

  [AdminRole.SUPPORT_AGENT]: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW,
    Permission.USERS_MANAGE,
    Permission.HOSTS_VIEW,
    Permission.LISTINGS_VIEW,
    Permission.REVIEWS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_RESOLVE,
    Permission.BOOKINGS_VIEW,
    Permission.CASES_VIEW,
    Permission.CASES_MANAGE,
    Permission.CASES_COMPENSATE,
    Permission.CONTENT_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
  ],

  [AdminRole.BOOKING_MANAGER]: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW,
    Permission.HOSTS_VIEW,
    Permission.LISTINGS_VIEW,
    Permission.REVIEWS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.BOOKINGS_VIEW,
    Permission.BOOKINGS_MANAGE,
    Permission.CASES_VIEW,
    Permission.CASES_MANAGE,
    Permission.CASES_COMPENSATE,
    Permission.COUPONS_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
  ],

  [AdminRole.FINANCE_MANAGER]: [
    Permission.DASHBOARD_VIEW,
    Permission.USERS_VIEW,
    Permission.HOSTS_VIEW,
    Permission.LISTINGS_VIEW,
    Permission.BOOKINGS_VIEW,
    Permission.AUDIT_VIEW,
    Permission.FINANCE_VIEW,
    Permission.FINANCE_REFUNDS,
    Permission.FINANCE_PAYOUTS,
    Permission.FINANCE_RECONCILE,
    Permission.FINANCE_CONFIG,
    Permission.FINANCE_EXPORT,
    Permission.COUPONS_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
  ],
};

type AdminIdentity = Pick<User, 'role' | 'adminRole'>;

/**
 * Returns the effective permission set for an account.
 *
 * Non-admins always receive an empty set. Legacy admin accounts without an
 * `adminRole` are treated as Super Admins so the migration cannot lock the
 * existing administrator out during deployment.
 */
export function getAdminPermissions(user: AdminIdentity | null | undefined): Permission[] {
  if (!user || user.role !== UserRole.ADMIN) {
    return [];
  }

  if (!user.adminRole) {
    return [...ALL_PERMISSIONS];
  }

  return [...(ADMIN_ROLE_PERMISSIONS[user.adminRole] || [])];
}

export function hasPermission(
  user: AdminIdentity | null | undefined,
  permission: Permission,
): boolean {
  return getAdminPermissions(user).includes(permission);
}

export function hasAnyPermission(
  user: AdminIdentity | null | undefined,
  permissions: Permission[],
): boolean {
  if (permissions.length === 0) return true;
  const granted = new Set(getAdminPermissions(user));
  return permissions.some((permission) => granted.has(permission));
}
