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
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'INVESTIGATING':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
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
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
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
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="report-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">{footer}</div>}
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#33599E]">
            Trust and safety
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Reports</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Triage reports about listings and guest reviews. Closing a report requires a written
            resolution note and is recorded in the audit log.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((tick) => tick + 1)}
          disabled={loading || !canView}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canView ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your role does not include permission to view reports.
        </div>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_180px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={draft.q}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, q: event.target.value }))
                  }
                  placeholder="Search reporter or details"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                />
              </div>

              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
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
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
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
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
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
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#33599E] px-4 text-sm font-semibold text-white hover:bg-[#284A86]"
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
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                {total.toLocaleString()} report{total === 1 ? '' : 's'}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-[#33599E] hover:text-[#284A86]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load reports</p>
                <p className="mt-0.5 text-rose-600">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefreshTick((tick) => tick + 1)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Report', 'Target', 'Reporter', 'Status', 'Opened', 'Actions'].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ${
                            heading === 'Actions' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && reports.length === 0
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    : reports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50/70">
                          <td className="max-w-[280px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                                <Flag className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800">
                                  {REPORT_REASON_LABELS[report.reason] || report.reason}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                  {report.details || 'No additional details.'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">
                                <TargetIcon target={report.target} />
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-xs font-semibold text-slate-700">
                                  {targetLabel(report.target)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {report.targetType === 'LISTING' ? 'Listing' : 'Guest review'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[200px] truncate text-xs font-semibold text-slate-700">
                              {report.reporter?.name || 'Deleted user'}
                            </p>
                            <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-400">
                              {report.reporter?.email || 'No email'}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClasses(
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
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">
                            {formatDate(report.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openDetail(report.id)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#33599E] hover:bg-[#33599E]/5"
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
                <Flag className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-base font-bold text-slate-700">No reports found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {hasFilters ? 'No reports match these filters.' : 'New reports will appear here.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Page {page} of {totalPages} · {total.toLocaleString()} report
                {total === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            {detail && canResolve && detail.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => openStatusDialog(detail, 'INVESTIGATING')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <XCircle className="h-4 w-4" />
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => openStatusDialog(detail, 'RESOLVED')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
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
          <div className="flex flex-col items-center justify-center py-14 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#33599E]" />
            <p className="mt-2 text-sm font-medium">Loading report…</p>
          </div>
        ) : detailError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Could not load report</p>
            <p className="mt-1">{detailError}</p>
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClasses(
                  detail.status,
                )}`}
              >
                {REPORT_STATUS_LABELS[detail.status]}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {REPORT_REASON_LABELS[detail.reason] || detail.reason}
              </span>
              <span className="text-xs text-slate-500">
                Opened {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Reporter details</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {detail.details || 'No additional details were provided.'}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {detail.reporter?.name || 'Deleted user'} ·{' '}
                {detail.reporter?.email || 'No email'} · {detail.reporter?.id || 'No account'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-slate-700">Reported target</p>
              {!detail.target ? (
                <p className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                  Target data is unavailable.
                </p>
              ) : detail.target.missing ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  The reported {detail.targetType.toLowerCase()} no longer exists.
                </p>
              ) : detail.target.type === 'LISTING' ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {detail.target.title || 'Listing'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {detail.target.city || 'Unknown city'}
                        {detail.target.address ? ` · ${detail.target.address}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                          Status: {detail.target.status || 'UNKNOWN'}
                        </span>
                        {detail.target.adminHidden && (
                          <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                            Hidden from public view
                          </span>
                        )}
                      </div>
                      {detail.target.host && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Host: {detail.target.host.name} · {detail.target.host.email}
                        </p>
                      )}
                      {detail.target.adminHiddenReason && (
                        <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700">
                          Hide reason: {detail.target.adminHiddenReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
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
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {detail.target.authorName || detail.target.author?.name || 'Guest review'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            detail.target.moderationStatus === 'HIDDEN'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {detail.target.moderationStatus === 'HIDDEN' ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {detail.target.comment || 'No comment provided.'}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Listing: {detail.target.propertyTitle || detail.target.propertyId || '—'}
                      </p>
                      {detail.target.moderationReason && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                          Moderation note: {detail.target.moderationReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Resolution</p>
              {detail.resolutionNote ? (
                <div className="mt-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p>{detail.resolutionNote}</p>
                  <p className="mt-1.5 text-[11px] text-emerald-700">
                    {detail.resolvedBy?.name || 'Unknown admin'}
                    {detail.resolvedAt ? ` · ${formatDateTime(detail.resolvedAt)}` : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-1 rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                  ? 'bg-slate-700 hover:bg-slate-800'
                  : nextStatus === 'RESOLVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
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
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#33599E]" />
            <p>
              Status changes are permanent for closed reports. Use the target moderation screens
              separately if the listing or review also needs to be hidden.
            </p>
          </div>

          <div>
            <label htmlFor="resolution-note" className="text-xs font-bold text-slate-700">
              Resolution note{' '}
              {nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED' ? (
                <span className="text-rose-500">*</span>
              ) : (
                <span className="font-normal text-slate-400">(optional)</span>
              )}
            </label>
            <textarea
              id="resolution-note"
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Summarise what was checked and the outcome."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Required when resolving or dismissing</span>
              <span>{resolutionNote.length}/2000</span>
            </div>
          </div>

          {statusError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
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
              ? 'border-emerald-200 bg-white text-emerald-800'
              : 'border-rose-200 bg-white text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          <p className="font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 rounded p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
