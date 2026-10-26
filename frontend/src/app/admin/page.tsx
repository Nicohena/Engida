'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
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

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AdminDashboardSummary>('/admin/dashboard/summary');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = summary?.counts;
  const canViewAudit = can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW);

  const cards = [
    {
      label: 'Pending listing reviews',
      value: counts?.pendingListingReviews ?? 0,
      hint: 'Awaiting a moderation decision',
      icon: ClipboardCheck,
      tone: 'amber',
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_REVIEW,
    },
    {
      label: 'Pending host checks',
      value: counts?.pendingHostVerifications ?? 0,
      hint: 'Identity verification queue',
      icon: BadgeCheck,
      tone: 'blue',
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.HOSTS_VERIFY,
    },
    {
      label: 'Active users',
      value: counts?.activeUsers ?? 0,
      hint: 'Guests, hosts and admins',
      icon: Users,
      tone: 'emerald',
      href: '/admin/users',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
    {
      label: 'Suspended users',
      value: counts?.suspendedUsers ?? 0,
      hint: 'Accounts currently blocked',
      icon: AlertTriangle,
      tone: 'rose',
      href: '/admin/users?isActive=false',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
    {
      label: 'Published listings',
      value: counts?.publishedListings ?? 0,
      hint: 'Visible on the public site',
      icon: Building2,
      tone: 'indigo',
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_REVIEW,
    },
    {
      label: 'Hidden listings',
      value: counts?.hiddenListings ?? 0,
      hint: 'Removed from public view',
      icon: EyeOff,
      tone: 'slate',
      href: '/admin/moderation',
      permission: ADMIN_PERMISSIONS.LISTINGS_HIDE,
    },
    {
      label: 'Active admins',
      value: counts?.activeAdmins ?? 0,
      hint: 'Accounts with console access',
      icon: ShieldCheck,
      tone: 'violet',
      href: '/admin/users?role=ADMIN',
      permission: ADMIN_PERMISSIONS.USERS_VIEW,
    },
    {
      label: 'Open reports',
      value: counts?.openReports ?? 0,
      hint: 'Awaiting trust and safety triage',
      icon: Flag,
      tone: 'rose',
      href: '/admin/reports',
      permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
    },
  ];

  const toneClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
  };

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-[#0F172A] px-6 py-7 sm:px-8">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#33599E]/30 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8FB3F5]">
                Operations snapshot
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Keep trust work moving.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Review new listings, verify hosts and keep account access under control.
                Every privileged action is recorded in the audit log.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Dashboard could not be refreshed</p>
              <p className="mt-0.5 text-rose-600">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const allowed = can(user?.permissions, card.permission);
            const body = (
              <div className="h-full bg-white p-5 transition hover:bg-slate-50/80">
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl border p-2 ${toneClasses[card.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {allowed && <ArrowRight className="h-4 w-4 text-slate-300" />}
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {loading && !summary ? '—' : card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{card.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{card.hint}</p>
              </div>
            );

            return allowed ? (
              <Link key={card.label} href={card.href} className="block">
                {body}
              </Link>
            ) : (
              <div key={card.label}>{body}</div>
            );
          })}
        </div>
      </section>

      <div
        className={
          canViewAudit
            ? 'grid gap-6 lg:grid-cols-[1.15fr_0.85fr]'
            : 'grid gap-6'
        }
      >
        {canViewAudit && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent privileged actions</h3>
              <p className="mt-0.5 text-xs text-slate-500">Latest entries from the audit trail.</p>
            </div>
            {can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW) && (
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#33599E] hover:text-[#284A86]"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {loading && !summary ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-3.5">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/5 animate-pulse rounded bg-slate-100" />
                    <div className="h-2.5 w-3/5 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : summary?.recentAudit?.length ? (
              summary.recentAudit.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {formatAction(entry.action)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.actorEmail || 'System'} · {entry.entityType}
                      {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {relativeTime(entry.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">No audit entries yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Privileged actions will appear here as your team works.
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-slate-900">Quick actions</h3>
          <p className="mt-0.5 text-xs text-slate-500">The highest-value queues for this shift.</p>

          <div className="mt-4 space-y-2.5">
            {can(user?.permissions, ADMIN_PERMISSIONS.LISTINGS_REVIEW) && (
              <Link
                href="/admin/moderation"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Review listing queue</p>
                  <p className="text-xs text-slate-500">
                    {counts?.pendingListingReviews ?? 0} listing
                    {(counts?.pendingListingReviews ?? 0) === 1 ? '' : 's'} waiting
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {can(user?.permissions, ADMIN_PERMISSIONS.HOSTS_VERIFY) && (
              <Link
                href="/admin/moderation"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Verify host identities</p>
                  <p className="text-xs text-slate-500">
                    {counts?.pendingHostVerifications ?? 0} host
                    {(counts?.pendingHostVerifications ?? 0) === 1 ? '' : 's'} pending
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {can(user?.permissions, ADMIN_PERMISSIONS.USERS_VIEW) && (
              <Link
                href="/admin/users"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Manage accounts</p>
                  <p className="text-xs text-slate-500">Search, suspend and assign admin roles</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {can(user?.permissions, ADMIN_PERMISSIONS.REVIEWS_VIEW) && (
              <Link
                href="/admin/reviews"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Moderate guest reviews</p>
                  <p className="text-xs text-slate-500">
                    {counts?.totalReviews ?? 0} review
                    {(counts?.totalReviews ?? 0) === 1 ? '' : 's'} on record
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {can(user?.permissions, ADMIN_PERMISSIONS.REPORTS_VIEW) && (
              <Link
                href="/admin/reports"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                  <Flag className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Triage reports</p>
                  <p className="text-xs text-slate-500">
                    {counts?.openReports ?? 0} open report
                    {(counts?.openReports ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW) && (
              <Link
                href="/admin/audit"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-[#33599E]/30 hover:bg-[#33599E]/5 transition"
              >
                <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Open audit log</p>
                  <p className="text-xs text-slate-500">Inspect who changed what</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#33599E]" />
              </Link>
            )}

            {!can(user?.permissions, ADMIN_PERMISSIONS.LISTINGS_REVIEW) &&
              !can(user?.permissions, ADMIN_PERMISSIONS.HOSTS_VERIFY) &&
              !can(user?.permissions, ADMIN_PERMISSIONS.USERS_VIEW) &&
              !can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW) && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Your role has read-only access to the overview.
                </p>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
