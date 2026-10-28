'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flag,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  ADMIN_PERMISSIONS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  can,
  type AdminReport,
  type AdminReportTarget,
  type PaginatedAdminReports,
  type ReportReason,
  type ReportStatus,
} from '../../../types/admin';

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClasses(status: ReportStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-[#f7ebda] text-[#8a5e20] border-[#ecd9c2]';
    case 'INVESTIGATING':
      return 'bg-[#f2eadf] text-[#8a5e20] border-[#e3d5c1]';
    case 'RESOLVED':
      return 'bg-[#edf1e8] text-[#4f6648] border-[#d6dfcd]';
    default:
      return 'bg-[#efe7dc] text-[#6c5d52] border-[#d8d0c8]';
  }
}

function targetLabel(target: AdminReport['target']): string {
  if (!target) return 'Target unavailable';
  if (target.missing) return 'Target no longer exists';
  if (target.type === 'LISTING') return target.title || 'Listing';
  return target.propertyTitle || 'Guest review';
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

function Modal({ open, onClose, title, description, children, footer, wide }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#2f2722]/55 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8d0c8] px-5 py-4">
          <div>
            <h2 id="report-dialog-title" className="text-base font-bold text-[#3a302a]">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-[#7a6b5f]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#7a6b5f] hover:bg-[#efe7dc] hover:text-[#6c5d52]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-[#d8d0c8] bg-[#f6f0e8]/80 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

function TargetIcon({ target }: { target: AdminReportTarget | null }) {
  if (target?.type === 'LISTING') {
    return <Building2 className="h-4 w-4" />;
  }
  if (target?.type === 'REVIEW') {
    return <Star className="h-4 w-4" />;
  }
  return <AlertTriangle className="h-4 w-4" />;
}

export default function AdminReportsPage() {
  const { user } = useAuth();
  const canView = can(user?.permissions, ADMIN_PERMISSIONS.REPORTS_VIEW);
  const canResolve = can(user?.permissions, ADMIN_PERMISSIONS.REPORTS_RESOLVE);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [draft, setDraft] = useState({
    q: '',
    status: 'all',
    targetType: 'all',
    reason: 'all',
  });
  const [applied, setApplied] = useState({
    q: '',
    status: 'all',
    targetType: 'all',
    reason: 'all',
  });
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<AdminReport | null>(null);
  const [nextStatus, setNextStatus] = useState<ReportStatus | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (applied.q.trim()) params.set('q', applied.q.trim());
        if (applied.status !== 'all') params.set('status', applied.status);
        if (applied.targetType !== 'all') params.set('targetType', applied.targetType);
        if (applied.reason !== 'all') params.set('reason', applied.reason);

        const data = await apiFetch<PaginatedAdminReports>(`/admin/reports?${params.toString()}`);
        if (cancelled) return;
        setReports(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (page > data.totalPages) setPage(data.totalPages || 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load reports');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [canView, applied, page, refreshTick]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  };

  const clearFilters = () => {
    setDraft({ q: '', status: 'all', targetType: 'all', reason: 'all' });
    setApplied({ q: '', status: 'all', targetType: 'all', reason: 'all' });
    setPage(1);
  };

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await apiFetch<AdminReport>(`/admin/reports/${id}`);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load this report');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openStatusDialog = (report: AdminReport, status: ReportStatus) => {
    setStatusTarget(report);
    setNextStatus(status);
    setResolutionNote('');
    setStatusError(null);
  };

  const submitStatus = async () => {
    if (!statusTarget || !nextStatus) return;
    const terminal = nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED';
    if (terminal && resolutionNote.trim().length < 5) {
      setStatusError('Add a resolution note of at least 5 characters.');
      return;
    }

    setStatusSubmitting(true);
    setStatusError(null);
    try {
      await apiFetch(`/admin/reports/${statusTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          resolutionNote: resolutionNote.trim() || undefined,
        }),
      });
      setToast({
        type: 'success',
        message: `Report moved to ${REPORT_STATUS_LABELS[nextStatus]}.`,
      });
      setStatusTarget(null);
      setDetailOpen(false);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not update the report');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const hasFilters =
    Boolean(applied.q) ||
    applied.status !== 'all' ||
    applied.targetType !== 'all' ||
    applied.reason !== 'all';

  const terminal = detail?.status === 'RESOLVED' || detail?.status === 'DISMISSED';

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Reports"
        description="Triage reports about listings and guest reviews. Closing a report requires a written resolution note and is recorded in the audit log."
        actions={
          <button
            type="button"
            onClick={() => setRefreshTick((tick) => tick + 1)}
            disabled={loading || !canView}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            Refresh
          </button>
        }
      />

      {!canView ? (
        <div className="rounded-2xl border border-[#ecd9c2] bg-[#f7ebda] p-6 text-sm text-[#7a531c]">
          Your role does not include permission to view reports.
        </div>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-[#d8d0c8] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_180px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6b5f]" />
                <input
                  type="search"
                  value={draft.q}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, q: event.target.value }))
                  }
                  placeholder="Search reporter or details"
                  className="h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] pl-9 pr-3 text-sm text-[#4a3e35] outline-none transition focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                />
              </div>

              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
                className="h-10 rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#5a4c42] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                aria-label="Filter by report status"
              >
                <option value="all">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              <select
                value={draft.targetType}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, targetType: event.target.value }))
                }
                className="h-10 rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#5a4c42] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                aria-label="Filter by target type"
              >
                <option value="all">All targets</option>
                <option value="LISTING">Listings</option>
                <option value="REVIEW">Reviews</option>
              </select>

              <select
                value={draft.reason}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, reason: event.target.value }))
                }
                className="h-10 rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#5a4c42] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                aria-label="Filter by reason"
              >
                <option value="all">All reasons</option>
                {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((reason) => (
                  <option key={reason} value={reason}>
                    {REPORT_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b3541e] px-4 text-sm font-semibold text-white hover:bg-[#934313]"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={
                    !hasFilters &&
                    !draft.q &&
                    draft.status === 'all' &&
                    draft.targetType === 'all' &&
                    draft.reason === 'all'
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white px-3 text-sm font-semibold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7a6b5f]">
                {total.toLocaleString()} report{total === 1 ? '' : 's'}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-[#b3541e] hover:text-[#934313]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#ecd0c9] bg-[#f8e9e5] p-4 text-sm text-[#8f4035]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load reports</p>
                <p className="mt-0.5 text-[#a24b3e]">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefreshTick((tick) => tick + 1)}
                className="rounded-lg border border-[#ecd0c9] bg-white px-3 py-1.5 text-xs font-bold text-[#8f4035] hover:bg-[#f3dcd6]"
              >
                Retry
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#d8d0c8]">
                <thead className="bg-[#f6f0e8]">
                  <tr>
                    {['Report', 'Target', 'Reporter', 'Status', 'Opened', 'Actions'].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f] ${
                            heading === 'Actions' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece4d9]">
                  {loading && reports.length === 0
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 animate-pulse rounded-lg bg-[#efe7dc]" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/3 animate-pulse rounded bg-[#efe7dc]" />
                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#efe7dc]" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    : reports.map((report) => (
                        <tr key={report.id} className="hover:bg-[#f6f0e8]/70">
                          <td className="max-w-[280px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f8e9e5] text-[#8f4035]">
                                <Flag className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#4a3e35]">
                                  {REPORT_REASON_LABELS[report.reason] || report.reason}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-[#7a6b5f]">
                                  {report.details || 'No additional details.'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[#7a6b5f]">
                                <TargetIcon target={report.target} />
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-xs font-semibold text-[#5a4c42]">
                                  {targetLabel(report.target)}
                                </p>
                                <p className="mt-0.5 text-xs text-[#7a6b5f]">
                                  {report.targetType === 'LISTING' ? 'Listing' : 'Guest review'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[200px] truncate text-xs font-semibold text-[#5a4c42]">
                              {report.reporter?.name || 'Deleted user'}
                            </p>
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-[#7a6b5f]">
                              {report.reporter?.email || 'No email'}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(
                                report.status,
                              )}`}
                            >
                              {report.status === 'OPEN' ? (
                                <Clock3 className="h-3 w-3" />
                              ) : report.status === 'INVESTIGATING' ? (
                                <Search className="h-3 w-3" />
                              ) : report.status === 'RESOLVED' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {REPORT_STATUS_LABELS[report.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-[#7a6b5f]">
                            {formatDate(report.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openDetail(report.id)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#b3541e] hover:bg-[#b3541e]/5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!loading && reports.length === 0 && !error && (
              <div className="px-6 py-14 text-center">
                <Flag className="mx-auto h-10 w-10 text-[#c2b6aa]" />
                <h2 className="mt-3 font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">No reports found</h2>
                <p className="mt-1 text-sm text-[#7a6b5f]">
                  {hasFilters ? 'No reports match these filters.' : 'New reports will appear here.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[#d8d0c8] bg-[#f6f0e8]/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-[#7a6b5f]">
                {total === 0 ? (
                  'No reports to display'
                ) : (
                  <>
                    Page {page} of {totalPages} · {total.toLocaleString()} report
                    {total === 1 ? '' : 's'}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8d0c8] bg-white px-2.5 text-xs font-bold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8d0c8] bg-white px-2.5 text-xs font-bold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Report details"
        description="Reporter context, target state and resolution history."
        wide
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8]"
            >
              Close
            </button>
            {detail && canResolve && detail.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => openStatusDialog(detail, 'INVESTIGATING')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3d5c1] bg-[#f2eadf] px-3 py-2 text-sm font-semibold text-[#8a5e20] hover:bg-[#efe2ce]"
              >
                <PlayCircle className="h-4 w-4" />
                Start investigating
              </button>
            )}
            {detail && canResolve && !terminal && (
              <>
                <button
                  type="button"
                  onClick={() => openStatusDialog(detail, 'DISMISSED')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8d0c8] bg-white px-3 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8]"
                >
                  <XCircle className="h-4 w-4" />
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => openStatusDialog(detail, 'RESOLVED')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5d7554] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4f6648]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </button>
              </>
            )}
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-14 text-[#7a6b5f]">
            <Loader2 className="h-6 w-6 animate-spin text-[#b3541e]" />
            <p className="mt-2 text-sm font-medium">Loading report…</p>
          </div>
        ) : detailError ? (
          <div className="rounded-xl border border-[#ecd0c9] bg-[#f8e9e5] p-4 text-sm text-[#8f4035]">
            <p className="font-semibold">Could not load report</p>
            <p className="mt-1">{detailError}</p>
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(
                  detail.status,
                )}`}
              >
                {REPORT_STATUS_LABELS[detail.status]}
              </span>
              <span className="rounded-full bg-[#efe7dc] px-2.5 py-1 text-xs font-bold text-[#6c5d52]">
                {REPORT_REASON_LABELS[detail.reason] || detail.reason}
              </span>
              <span className="text-xs text-[#7a6b5f]">
                Opened {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-[#5a4c42]">Reporter details</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-[#d8d0c8] bg-white p-3 text-sm text-[#5a4c42]">
                {detail.details || 'No additional details were provided.'}
              </p>
              <p className="mt-1.5 text-xs text-[#7a6b5f]">
                {detail.reporter?.name || 'Deleted user'} ·{' '}
                {detail.reporter?.email || 'No email'} · {detail.reporter?.id || 'No account'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-[#5a4c42]">Reported target</p>
              {!detail.target ? (
                <p className="rounded-xl border border-[#d8d0c8] p-3 text-sm text-[#7a6b5f]">
                  Target data is unavailable.
                </p>
              ) : detail.target.missing ? (
                <p className="rounded-xl border border-[#ecd0c9] bg-[#f8e9e5] p-3 text-sm text-[#8f4035]">
                  The reported {detail.targetType.toLowerCase()} no longer exists.
                </p>
              ) : detail.target.type === 'LISTING' ? (
                <div className="rounded-xl border border-[#d8d0c8] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#f2eadf] p-2 text-[#8a5e20]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#4a3e35]">
                        {detail.target.title || 'Listing'}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7a6b5f]">
                        {detail.target.city || 'Unknown city'}
                        {detail.target.address ? ` · ${detail.target.address}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className="rounded-full bg-[#efe7dc] px-2 py-1 text-[#6c5d52]">
                          Status: {detail.target.status || 'UNKNOWN'}
                        </span>
                        {detail.target.adminHidden && (
                          <span className="rounded-full bg-[#f8e9e5] px-2 py-1 text-[#8f4035]">
                            Hidden from public view
                          </span>
                        )}
                      </div>
                      {detail.target.host && (
                        <p className="mt-2 text-xs text-[#7a6b5f]">
                          Host: {detail.target.host.name} · {detail.target.host.email}
                        </p>
                      )}
                      {detail.target.adminHiddenReason && (
                        <p className="mt-2 rounded-lg bg-[#f8e9e5] px-2.5 py-2 text-xs text-[#8f4035]">
                          Hide reason: {detail.target.adminHiddenReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#d8d0c8] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#f7ebda] p-2 text-[#8a5e20]">
                      <Star className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={`h-3.5 w-3.5 ${
                                index < (detail.target?.rating || 0)
                                  ? 'fill-amber-400 text-[#c89658]'
                                  : 'text-[#c2b6aa]'
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-xs font-semibold text-[#5a4c42]">
                          {detail.target.authorName || detail.target.author?.name || 'Guest review'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            detail.target.moderationStatus === 'HIDDEN'
                              ? 'bg-[#e7ded2] text-[#5a4c42]'
                              : 'bg-[#edf1e8] text-[#4f6648]'
                          }`}
                        >
                          {detail.target.moderationStatus === 'HIDDEN' ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#5a4c42]">
                        {detail.target.comment || 'No comment provided.'}
                      </p>
                      <p className="mt-2 text-xs text-[#7a6b5f]">
                        Listing: {detail.target.propertyTitle || detail.target.propertyId || '—'}
                      </p>
                      {detail.target.moderationReason && (
                        <p className="mt-2 rounded-lg bg-[#f6f0e8] px-2.5 py-2 text-xs text-[#6c5d52]">
                          Moderation note: {detail.target.moderationReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-[#5a4c42]">Resolution</p>
              {detail.resolutionNote ? (
                <div className="mt-1 rounded-xl border border-[#d6dfcd] bg-[#edf1e8] p-3 text-sm text-[#405a3a]">
                  <p>{detail.resolutionNote}</p>
                  <p className="mt-1.5 text-xs text-[#4f6648]">
                    {detail.resolvedBy?.name || 'Unknown admin'}
                    {detail.resolvedAt ? ` · ${formatDateTime(detail.resolvedAt)}` : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-1 rounded-xl border border-[#d8d0c8] p-3 text-sm text-[#7a6b5f]">
                  This report has not been closed yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(statusTarget && nextStatus)}
        onClose={() => setStatusTarget(null)}
        title={
          nextStatus ? `Move report to ${REPORT_STATUS_LABELS[nextStatus]}` : 'Update report'
        }
        description={
          statusTarget ? `${REPORT_REASON_LABELS[statusTarget.reason]} · ${targetLabel(statusTarget.target)}` : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              disabled={statusSubmitting}
              className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitStatus}
              disabled={
                statusSubmitting ||
                ((nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED') &&
                  resolutionNote.trim().length < 5)
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                nextStatus === 'DISMISSED'
                  ? 'bg-[#5a4c42] hover:bg-[#463a31]'
                  : nextStatus === 'RESOLVED'
                    ? 'bg-[#5d7554] hover:bg-[#4f6648]'
                    : 'bg-[#9a671f] hover:bg-[#8a5e20]'
              }`}
            >
              {statusSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nextStatus === 'INVESTIGATING' ? (
                <PlayCircle className="h-4 w-4" />
              ) : nextStatus === 'RESOLVED' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Save status
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-[#f6f0e8] p-3 text-xs text-[#6c5d52]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b3541e]" />
            <p>
              Status changes are permanent for closed reports. Use the target moderation screens
              separately if the listing or review also needs to be hidden.
            </p>
          </div>

          <div>
            <label htmlFor="resolution-note" className="text-xs font-bold text-[#5a4c42]">
              Resolution note{' '}
              {nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED' ? (
                <span className="text-[#a24b3e]">*</span>
              ) : (
                <span className="font-normal text-[#7a6b5f]">(optional)</span>
              )}
            </label>
            <textarea
              id="resolution-note"
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Summarise what was checked and the outcome."
              className="mt-1.5 w-full resize-none rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 py-2.5 text-sm text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
            />
            <div className="mt-1 flex justify-between text-xs text-[#7a6b5f]">
              <span>Required when resolving or dismissing</span>
              <span>{resolutionNote.length}/2000</span>
            </div>
          </div>

          {statusError && (
            <p className="rounded-lg bg-[#f8e9e5] px-3 py-2 text-xs font-medium text-[#8f4035]">
              {statusError}
            </p>
          )}
        </div>
      </Modal>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-[#d6dfcd] bg-white text-[#405a3a]'
              : 'border-[#ecd0c9] bg-white text-[#7d352b]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5d7554]" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#a24b3e]" />
          )}
          <p className="font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 rounded p-0.5 text-[#7a6b5f] hover:text-[#6c5d52]"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
