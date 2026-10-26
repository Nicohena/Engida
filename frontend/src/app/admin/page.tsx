'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  Clock3,
  EyeOff,
  Flag,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  ADMIN_PERMISSIONS,
  can,
  formatAction,
  type AdminDashboardSummary,
} from '../../types/admin';

function relativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface QueueItem {
  label: string;
  description: string;
  value: number;
  href: string;
  permission: (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface PulseItem {
  label: string;
  hint: string;
  value: number;
  href?: string;
  permission?: (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<AdminDashboardSummary>('/admin/dashboard/summary')
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load the dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setRefreshTick((tick) => tick + 1);
  };

  const counts = summary?.counts;
  const canViewAudit = can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW);

  const queueItems: QueueItem[] = [
    {
      label: 'Listing reviews',
      description: 'New properties and listing edits awaiting a decision.',
      value: counts?.pendingListingReviews ?? 0,
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_REVIEW,
      icon: ClipboardCheck,
    },
    {
      label: 'Host verifications',
      description: 'Identity files that need a trust decision.',
      value: counts?.pendingHostVerifications ?? 0,
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.HOSTS_VERIFY,
      icon: BadgeCheck,
    },
    {
      label: 'Open reports',
      description: 'Guest and host reports awaiting triage.',
      value: counts?.openReports ?? 0,
      href: '/admin/reports',
      permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
      icon: Flag,
    },
  ];

  const visibleQueues = queueItems.filter((item) => can(user?.permissions, item.permission));
  const openTotal = visibleQueues.reduce((sum, item) => sum + item.value, 0);

  const pulseItems: PulseItem[] = [
    {
      label: 'Active accounts',
      hint: 'Guests, hosts and admins',
      value: counts?.activeUsers ?? 0,
      href: '/admin/users',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
    {
      label: 'Published stays',
      hint: 'Visible on the marketplace',
      value: counts?.publishedListings ?? 0,
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_REVIEW,
    },
    {
      label: 'Guest reviews',
      hint: 'Reviews on record',
      value: counts?.totalReviews ?? 0,
      href: '/admin/reviews',
      permission: ADMIN_PERMISSIONS.REVIEWS_VIEW,
    },
    {
      label: 'Active admins',
      hint: 'Console accounts with access',
      value: counts?.activeAdmins ?? 0,
      href: '/admin/users?role=ADMIN',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
    {
      label: 'Hidden stays',
      hint: 'Removed from public view',
      value: counts?.hiddenListings ?? 0,
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_HIDE,
    },
    {
      label: 'Suspended accounts',
      hint: 'Accounts currently blocked',
      value: counts?.suspendedUsers ?? 0,
      href: '/admin/users?isActive=false',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
  ];

  const quickActions = useMemo(() => {
    const moderationActions = can(user?.permissions, ADMIN_PERMISSIONS.LISTINGS_REVIEW)
      ? [
          {
            href: '/admin/moderation',
            label: 'Moderation desk',
            hint: 'Listings and host checks',
            icon: ClipboardCheck,
            permission: ADMIN_PERMISSIONS.LISTINGS_REVIEW,
          },
        ]
      : can(user?.permissions, ADMIN_PERMISSIONS.HOSTS_VERIFY)
        ? [
            {
              href: '/admin/moderation',
              label: 'Host verifications',
              hint: 'Identity review queue',
              icon: UserCheck,
              permission: ADMIN_PERMISSIONS.HOSTS_VERIFY,
            },
          ]
        : [];

    return [
      ...moderationActions,
      {
        href: '/admin/users',
        label: 'Accounts & access',
        hint: 'Search, suspend and assign roles',
        icon: Users,
        permission: ADMIN_PERMISSIONS.USERS_VIEW,
      },
      {
        href: '/admin/reviews',
        label: 'Guest reviews',
        hint: 'Moderate the review record',
        icon: Star,
        permission: ADMIN_PERMISSIONS.REVIEWS_VIEW,
      },
      {
        href: '/admin/reports',
        label: 'Trust reports',
        hint: 'Triage and resolve reports',
        icon: Flag,
        permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
      },
      {
        href: '/admin/audit',
        label: 'Audit trail',
        hint: 'Inspect privileged actions',
        icon: ShieldCheck,
        permission: ADMIN_PERMISSIONS.AUDIT_VIEW,
      },
    ].filter((action) => can(user?.permissions, action.permission));
  }, [user?.permissions]);

  const displayValue = (value: number) => {
    if (!summary) return '—';
    return value.toLocaleString();
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Operations overview"
        description="A working view of trust queues, marketplace health, and privileged activity."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            Refresh
          </button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[#ecd0c9] bg-[#f8e9e5] px-4 py-3.5 text-sm text-[#8f4035]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <div>
            <p className="font-semibold">The dashboard could not be refreshed</p>
            <p className="mt-0.5 text-[13px] text-[#9a5449]">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.8fr)]">
        <section
          className="admin-panel flex flex-col overflow-hidden"
          aria-labelledby="priority-queues-title"
        >
          <div className="flex flex-col gap-3 border-b border-[#d8d0c8] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <h2
                id="priority-queues-title"
                className="font-headline text-[1.4rem] font-semibold leading-tight tracking-[-0.015em] text-[#3a302a]"
              >
                Priority queues
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#78706a]">
                Decisions that keep trust moving today.
              </p>
            </div>
            {visibleQueues.length > 0 && summary && (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                  openTotal > 0
                    ? 'border-[#ecd9c2] bg-[#f7ebda] text-[#95631f]'
                    : 'border-[#d6dfcd] bg-[#edf1e8] text-[#536b4a]'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    openTotal > 0 ? 'bg-[#b37936]' : 'bg-[#6b815d]'
                  }`}
                />
                {openTotal > 0 ? `${openTotal} open` : 'Queue clear'}
              </span>
            )}
          </div>

          {visibleQueues.length > 0 ? (
            <div className="flex flex-1 flex-col divide-y divide-[#ece4d9]">
              {visibleQueues.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex flex-1 flex-col gap-4 px-5 py-5 transition-colors hover:bg-[#fbf7f1] sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e6ddd2] bg-[#f6f0e8] text-[#a85d2c]">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#3a302a]">{item.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[#78706a]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:ml-auto sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="admin-numeric font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                          {displayValue(item.value)}
                        </p>
                        <p
                          className={`mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                            !summary
                              ? 'text-[#6c5d52]'
                              : item.value > 0
                                ? 'text-[#95631f]'
                                : 'text-[#536b4a]'
                          }`}
                        >
                          {!summary
                            ? loading
                              ? 'loading'
                              : 'unavailable'
                            : item.value > 0
                              ? 'waiting'
                              : 'clear'}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-[#c9bdb1] transition-colors group-hover:text-[#b3541e]"
                        strokeWidth={1.8}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <ShieldCheck className="mx-auto h-7 w-7 text-[#c9bdb1]" strokeWidth={1.6} />
              <p className="mt-3 text-sm font-semibold text-[#3a302a]">No queues assigned</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#78706a]">
                Your role has read-only access to the operations overview.
              </p>
            </div>
          )}

          {visibleQueues.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[#ece4d9] bg-[#fbf7f1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-5 text-[#78706a]">
                Moderation decisions are written to the audit trail.
              </p>
              {canViewAudit && (
                <Link
                  href="/admin/audit"
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#b3541e] transition-colors hover:text-[#934313]"
                >
                  Audit trail
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="admin-panel overflow-hidden" aria-labelledby="marketplace-pulse-title">
          <div className="border-b border-[#d8d0c8] px-5 py-5 sm:px-6">
            <h2
              id="marketplace-pulse-title"
              className="font-headline text-[1.4rem] font-semibold leading-tight tracking-[-0.015em] text-[#3a302a]"
            >
              Marketplace pulse
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#78706a]">
              What is live, and who can act on it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[#ece4d9]">
            {pulseItems.map((item) => {
              const allowed = item.permission
                ? can(user?.permissions, item.permission)
                : false;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.13em] text-[#6c5d52]">
                      {item.label}
                    </p>
                    {allowed && (
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-[#d8d0c8] transition-colors group-hover:text-[#b3541e]"
                        strokeWidth={1.8}
                      />
                    )}
                  </div>
                  <p className="admin-numeric mt-3 font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                    {displayValue(item.value)}
                  </p>
                  <p className="mt-2 text-xs leading-4 text-[#78706a]">{item.hint}</p>
                </>
              );

              return allowed && item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group bg-white px-5 py-5 transition-colors hover:bg-[#fbf7f1]"
                >
                  {content}
                </Link>
              ) : (
                <div key={item.label} className="bg-white px-5 py-5">
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div
        className={
          canViewAudit
            ? 'grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]'
            : 'grid gap-5'
        }
      >
        {canViewAudit && (
          <section className="admin-panel overflow-hidden" aria-labelledby="recent-actions-title">
            <div className="flex items-start justify-between gap-4 border-b border-[#d8d0c8] px-5 py-5 sm:px-6">
              <div>
                <h2
                  id="recent-actions-title"
                  className="font-headline text-[1.4rem] font-semibold leading-tight tracking-[-0.015em] text-[#3a302a]"
                >
                  Recent privileged actions
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#78706a]">
                  The latest entries in the audit trail.
                </p>
              </div>
              <Link
                href="/admin/audit"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md py-1 text-xs font-bold text-[#b3541e] transition-colors hover:text-[#934313]"
              >
                Full log
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </Link>
            </div>

            <div className="divide-y divide-[#ece4d9]">
              {loading && !summary ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#e6ddd2]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 animate-pulse rounded bg-[#ece4d9]" />
                      <div className="h-2.5 w-3/5 animate-pulse rounded bg-[#f2ece4]" />
                    </div>
                  </div>
                ))
              ) : summary?.recentAudit?.length ? (
                summary.recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#b3541e]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#3a302a]">
                        {formatAction(entry.action)}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#78706a]">
                        {entry.actorEmail || 'System'} · {entry.entityType}
                        {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ''}
                      </p>
                    </div>
                    <time
                      dateTime={entry.createdAt}
                      className="shrink-0 pt-0.5 text-xs font-medium text-[#6c5d52]"
                    >
                      {relativeTime(entry.createdAt)}
                    </time>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Clock3 className="mx-auto h-7 w-7 text-[#c9bdb1]" strokeWidth={1.6} />
                  <p className="mt-3 text-sm font-semibold text-[#3a302a]">No actions recorded yet</p>
                  <p className="mt-1 text-xs leading-5 text-[#78706a]">
                    Privileged actions will appear here as your team works.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="admin-panel overflow-hidden" aria-labelledby="quick-actions-title">
          <div className="border-b border-[#d8d0c8] px-5 py-5 sm:px-6">
            <h2
              id="quick-actions-title"
              className="font-headline text-[1.4rem] font-semibold leading-tight tracking-[-0.015em] text-[#3a302a]"
            >
              Go straight there
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#78706a]">
              The work surfaces available to your role.
            </p>
          </div>

          {quickActions.length > 0 ? (
            <div className="divide-y divide-[#ece4d9]">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#fbf7f1] sm:px-6"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f0e8] text-[#8f6a50]">
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#3a302a]">
                        {action.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#78706a]">{action.hint}</p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-[#c9bdb1] transition-colors group-hover:text-[#b3541e]"
                      strokeWidth={1.8}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <EyeOff className="mx-auto h-6 w-6 text-[#c9bdb1]" strokeWidth={1.6} />
              <p className="mt-3 text-sm font-semibold text-[#3a302a]">Read-only access</p>
              <p className="mt-1 text-xs leading-5 text-[#78706a]">
                Your role can view the overview but has no management queues.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
