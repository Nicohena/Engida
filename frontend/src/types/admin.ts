export type AdminRole =
  | 'SUPER_ADMIN'
  | 'BOOKING_MANAGER'
  | 'SUPPORT_AGENT'
  | 'PROPERTY_MODERATOR'
  | 'FINANCE_MANAGER';

export const ADMIN_ROLE_OPTIONS: Array<{ value: AdminRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'PROPERTY_MODERATOR', label: 'Property Moderator' },
  { value: 'SUPPORT_AGENT', label: 'Support Agent' },
  { value: 'BOOKING_MANAGER', label: 'Booking Manager' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  BOOKING_MANAGER: 'Booking Manager',
  SUPPORT_AGENT: 'Support Agent',
  PROPERTY_MODERATOR: 'Property Moderator',
  FINANCE_MANAGER: 'Finance Manager',
};

export const ADMIN_PERMISSIONS = {
  DASHBOARD_VIEW: 'admin.dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  ADMINS_MANAGE: 'admins.manage',
  HOSTS_VIEW: 'hosts.view',
  HOSTS_VERIFY: 'hosts.verify',
  LISTINGS_VIEW: 'listings.view',
  LISTINGS_REVIEW: 'listings.review',
  LISTINGS_HIDE: 'listings.hide',
  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_MODERATE: 'reviews.moderate',
  REPORTS_VIEW: 'reports.view',
  REPORTS_RESOLVE: 'reports.resolve',
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_MANAGE: 'bookings.manage',
  CASES_VIEW: 'cases.view',
  CASES_MANAGE: 'cases.manage',
  CASES_COMPENSATE: 'cases.compensate',
  AUDIT_VIEW: 'audit.view',
  FINANCE_VIEW: 'finance.view',
  FINANCE_REFUNDS: 'finance.refunds',
  FINANCE_PAYOUTS: 'finance.payouts',
  FINANCE_RECONCILE: 'finance.reconcile',
  FINANCE_CONFIG: 'finance.config',
  FINANCE_EXPORT: 'finance.export',
  CATALOG_MANAGE: 'catalog.manage',
  COUPONS_MANAGE: 'coupons.manage',
  CONTENT_MANAGE: 'content.manage',
} as const;

export type Permission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export interface AdminHostProfileSummary {
  id: string;
  displayName: string | null;
  verificationStatus: string;
  phone: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  adminRole: AdminRole | null;
  isActive: boolean;
  avatar: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  hostProfile: AdminHostProfileSummary | null;
}

export interface AdminUserDetail extends AdminUser {
  permissions: Permission[];
  counts: {
    properties: number;
    bookingsAsGuest: number;
    bookingsAsHost: number;
    reviews: number;
  };
}

export interface PaginatedAdminUsers {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminDashboardSummary {
  counts: {
    pendingListingReviews: number;
    pendingHostVerifications: number;
    activeUsers: number;
    suspendedUsers: number;
    activeAdmins: number;
    publishedListings: number;
    hiddenListings: number;
    totalReviews: number;
    openReports: number;
    pendingBookings: number;
    confirmedBookings: number;
    openCases: number;
    overdueCases: number;
    unassignedCases: number;
  };
  recentAudit: AuditLogEntry[];
}

export type GuestReviewStatus = 'VISIBLE' | 'HIDDEN';

export interface AdminGuestReview {
  id: string;
  rating: number;
  comment: string | null;
  moderationStatus: GuestReviewStatus;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  } | null;
  property: {
    id: string;
    title: string;
    city: string;
    hostId: string;
  } | null;
  openReportCount: number;
}

export interface AdminGuestReviewDetail extends AdminGuestReview {
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  reports: AdminReportSummary[];
}

export interface PaginatedAdminGuestReviews {
  data: AdminGuestReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ReportTargetType = 'LISTING' | 'REVIEW';
export type ReportReason =
  | 'SCAM'
  | 'MISREPRESENTATION'
  | 'SAFETY'
  | 'OFFENSIVE'
  | 'SPAM'
  | 'OTHER';
export type ReportStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SCAM: 'Scam or fraud',
  MISREPRESENTATION: 'Listing is not as described',
  SAFETY: 'Safety concern',
  OFFENSIVE: 'Offensive content',
  SPAM: 'Spam or misleading',
  OTHER: 'Something else',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export interface AdminReportSummary {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reporterEmail: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminReportTarget {
  type: ReportTargetType;
  id: string;
  missing?: boolean;
  title?: string;
  city?: string;
  address?: string;
  status?: string;
  adminHidden?: boolean;
  adminHiddenReason?: string | null;
  hostId?: string;
  host?: {
    id: string;
    name: string;
    email: string;
  } | null;
  rating?: number;
  comment?: string | null;
  moderationStatus?: GuestReviewStatus;
  moderationReason?: string | null;
  propertyId?: string;
  propertyTitle?: string | null;
  authorName?: string | null;
  author?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  reporter: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
  resolvedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  target: AdminReportTarget | null;
}

export interface PaginatedAdminReports {
  data: AdminReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function can(userPermissions: string[] | undefined, permission: Permission): boolean {
  return Boolean(userPermissions?.includes(permission));
}

export function canAny(
  userPermissions: string[] | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => can(userPermissions, permission));
}

export function formatAdminRole(role: AdminRole | null | undefined): string {
  if (!role) return 'No admin role';
  return ADMIN_ROLE_LABELS[role] || role;
}

export function formatAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}
