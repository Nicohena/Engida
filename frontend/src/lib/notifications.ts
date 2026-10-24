import { apiFetch } from './api';
import {
  HostNotification,
  NotificationsResponse,
  UnreadCountResponse,
  QueryNotificationsParams,
} from '../types/notification';

/**
 * Fetches notifications with optional pagination and unread filter.
 */
export async function fetchNotifications(
  params?: QueryNotificationsParams,
): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.unreadOnly !== undefined) {
    searchParams.set('unreadOnly', String(params.unreadOnly));
  }

  const queryStr = searchParams.toString();
  const endpoint = queryStr ? `/notifications?${queryStr}` : '/notifications';
  return apiFetch<NotificationsResponse>(endpoint);
}

/**
 * Fetches unread notification count for badges and indicator dots.
 */
export async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
  return res.unreadCount ?? 0;
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<HostNotification> {
  return apiFetch<HostNotification>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

/**
 * Marks all notifications as read for the authenticated user.
 */
export async function markAllNotificationsAsRead(): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
}
