'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Sparkles,
  Building2,
  AlertCircle,
  RotateCcw,
  X,
  ExternalLink,
  Inbox,
  Check,
} from 'lucide-react';
import {
  HostNotification,
  NotificationType,
} from '../../types/notification';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../lib/notifications';

interface NotificationHubProps {
  /** Optional extra CSS classes for the trigger button */
  triggerClassName?: string;
  /** Whether to render as an icon button (default) or with label */
  variant?: 'icon' | 'sidebar-item';
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function getNotificationVisuals(type: NotificationType) {
  switch (type) {
    case 'BOOKING_REQUESTED':
      return {
        icon: CalendarPlus,
        bgColor: 'bg-[#f2ece4] text-[#c2652a] border-[#d8d0c8]',
        badgeColor: 'bg-[#f2ece4] text-[#c2652a]',
        label: 'Booking Request',
      };
    case 'BOOKING_CONFIRMED':
      return {
        icon: CalendarCheck,
        bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        label: 'Confirmed',
      };
    case 'BOOKING_CANCELLED':
      return {
        icon: CalendarX,
        bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeColor: 'bg-rose-100 text-rose-800',
        label: 'Cancellation',
      };
    case 'BOOKING_COMPLETED':
      return {
        icon: Sparkles,
        bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-800',
        label: 'Completed',
      };
    case 'LISTING_APPROVED':
      return {
        icon: CheckCircle2,
        bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        label: 'Listing Approved',
      };
    case 'LISTING_REJECTED':
      return {
        icon: AlertCircle,
        bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-800',
        label: 'Review Update',
      };
    default:
      return {
        icon: Building2,
        bgColor: 'bg-[#f2ece4] text-[#605850] border-[#d8d0c8]',
        badgeColor: 'bg-[#f2ece4] text-[#605850]',
        label: 'Host Alert',
      };
  }
}

export default function NotificationHub({
  triggerClassName = '',
  variant = 'icon',
}: NotificationHubProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync unread count with backend
  const syncUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently ignore background polling errors
    }
  }, []);

  // Poll unread count periodically (every 30 seconds)
  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (active) {
        void syncUnreadCount();
      }
    }, 0);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void syncUnreadCount();
      }
    }, 30000);

    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [syncUnreadCount]);

  // Load notifications whenever panel is opened or filter/refresh changes
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadNotifications = async () => {
      try {
        queueMicrotask(() => {
          if (active) {
            setLoading(true);
            setError(null);
          }
        });
        const res = await fetchNotifications({
          page: 1,
          limit: 30,
          unreadOnly: filterUnreadOnly,
        });
        if (!active) return;
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Could not load notifications';
        setError(msg);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [isOpen, filterUnreadOnly, refreshKey]);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notification: HostNotification,
  ) => {
    e.stopPropagation();
    if (notification.isRead) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(notification.id);
    } catch {
      // Revert on failure
      void syncUnreadCount();
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch {
      // Revert on failure
      setRefreshKey((k) => k + 1);
      void syncUnreadCount();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Navigate to destination on notification item click
  const handleNotificationClick = async (notification: HostNotification) => {
    if (!notification.isRead) {
      void markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const displayedNotifications = filterUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <>
      {/* ── Trigger Button ── */}
      {variant === 'sidebar-item' ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all w-full text-left cursor-pointer ${
            isOpen
              ? 'bg-[#c2652a]/20 text-[#e08850] font-bold border border-[#c2652a]/30 shadow-xs'
              : 'text-[#d8d0c8]/70 hover:text-[#faf5ee] hover:bg-white/5 font-semibold'
          } ${triggerClassName}`}
          aria-label="Open notifications hub"
        >
          <div className="relative">
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#c2652a] rounded-full ring-2 ring-[#241e1b]" />
            )}
          </div>
          <span className="text-sm flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#c2652a] text-white min-w-5 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative p-2 rounded-xl text-[#d8d0c8] hover:text-[#faf5ee] hover:bg-[#2e2622] transition focus:outline-hidden focus:ring-2 focus:ring-[#c2652a] cursor-pointer ${triggerClassName}`}
          aria-label={`Host notifications: ${unreadCount} unread`}
          title={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 bg-[#c2652a] text-white text-[10px] font-black rounded-full ring-2 ring-[#241e1b] shadow-xs animate-in fade-in zoom-in">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Modal / Drawer Panel ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#241e1b]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="relative w-full max-w-md bg-[#faf5ee] h-full shadow-2xl flex flex-col border-l border-[#d8d0c8] z-10 animate-in slide-in-from-right duration-200"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#d8d0c8] flex items-center justify-between bg-[#f2ece4]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f2ece4] text-[#c2652a] flex items-center justify-center border border-[#d8d0c8]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#3a302a] leading-tight">
                    Notifications
                  </h2>
                  <p className="text-xs text-[#605850]">
                    {unreadCount > 0
                      ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-[#605850] hover:text-[#3a302a] hover:bg-[#d8d0c8]/50 transition disabled:opacity-50 cursor-pointer"
                  title="Refresh notifications"
                  aria-label="Refresh"
                >
                  <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#605850] hover:text-[#3a302a] hover:bg-[#d8d0c8]/50 transition cursor-pointer"
                  aria-label="Close notifications panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Quick Action */}
            <div className="px-5 py-2.5 border-b border-[#d8d0c8] flex items-center justify-between gap-2 bg-[#faf5ee]">
              <div className="flex items-center gap-1 p-0.5 bg-[#f2ece4] rounded-lg text-xs font-semibold border border-[#d8d0c8]/60">
                <button
                  onClick={() => setFilterUnreadOnly(false)}
                  className={`px-3 py-1 rounded-md transition ${
                    !filterUnreadOnly
                      ? 'bg-white text-[#3a302a] shadow-xs'
                      : 'text-[#605850] hover:text-[#3a302a]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterUnreadOnly(true)}
                  className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                    filterUnreadOnly
                      ? 'bg-white text-[#3a302a] shadow-xs'
                      : 'text-[#605850] hover:text-[#3a302a]'
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#c2652a] text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll || loading}
                  className="text-xs font-semibold text-[#c2652a] hover:text-[#e08850] flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-[#f2ece4] transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#d8d0c8]/60">
              {/* Loading State */}
              {loading && notifications.length === 0 && (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-[#d8d0c8]/60 flex items-start gap-3 animate-pulse bg-[#f2ece4]/30"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#d8d0c8]/60 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-[#d8d0c8]/60 rounded-md w-3/4" />
                        <div className="h-3 bg-[#d8d0c8]/60 rounded-md w-full" />
                        <div className="h-2.5 bg-[#d8d0c8]/60 rounded-md w-1/4 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-[#3a302a] mb-1">
                    Failed to load notifications
                  </p>
                  <p className="text-xs text-[#605850] mb-4">{error}</p>
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && displayedNotifications.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 rounded-2xl bg-[#f2ece4] text-[#605850] flex items-center justify-center mb-3">
                    <Inbox className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#3a302a] mb-1">
                    {filterUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                  </h3>
                  <p className="text-xs text-[#605850] max-w-xs leading-relaxed">
                    {filterUnreadOnly
                      ? 'You are all caught up! Switch to "All" to review past events.'
                      : 'When guests request bookings, cancel, or when your listings are reviewed, alerts appear here.'}
                  </p>
                </div>
              )}

              {/* Notifications List */}
              {!error &&
                displayedNotifications.map((item) => {
                  const visuals = getNotificationVisuals(item.type);
                  const Icon = visuals.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-4 transition flex items-start gap-3.5 group cursor-pointer ${
                        item.isRead
                          ? 'bg-[#faf5ee] hover:bg-[#f2ece4]/50 text-[#3a302a]'
                          : 'bg-[#f2ece4]/40 hover:bg-[#f2ece4]/80 border-l-3 border-[#c2652a]'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${visuals.bgColor}`}
                      >
                        <Icon className="w-4.5 h-4.5 stroke-[2]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${visuals.badgeColor}`}
                          >
                            {visuals.label}
                          </span>
                          <span className="text-[11px] text-[#605850] font-medium whitespace-nowrap">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        <h4
                          className={`text-xs font-bold leading-snug mb-0.5 truncate ${
                            item.isRead ? 'text-[#3a302a]' : 'text-[#3a302a] font-extrabold'
                          }`}
                        >
                          {item.title}
                        </h4>

                        <p className="text-xs text-[#605850] leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        {/* Footer action link if present */}
                        {item.link && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#c2652a] group-hover:text-[#e08850]">
                            <span>View details</span>
                            <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        )}
                      </div>

                      {/* Mark as read button */}
                      {!item.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(e, item)}
                          title="Mark as read"
                          className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg text-[#605850] hover:text-[#c2652a] hover:bg-white border border-transparent hover:border-[#d8d0c8] shrink-0 cursor-pointer"
                          aria-label="Mark notification as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#d8d0c8] bg-[#f2ece4]/40 flex items-center justify-between text-xs text-[#605850]">
              <span className="text-[11px] font-medium">ENGIDA Host Hub</span>
              <span className="text-[11px] text-[#605850]">Auto-refreshed</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
