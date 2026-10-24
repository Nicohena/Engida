/**
 * Notification types matching backend Notification entity and enums.
 */

export type NotificationType =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED';

export interface HostNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: HostNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
