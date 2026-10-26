'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
  EyeOff,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  ADMIN_PERMISSIONS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  can,
  type AdminGuestReview,
  type AdminGuestReviewDetail,
  type PaginatedAdminGuestReviews,
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

function reportStatusClasses(status: ReportStatus): string {
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

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < value ? 'fill-amber-400 text-[#c89658]' : 'text-[#c2b6aa]'
          }`}
        />
      ))}
    </span>
  );
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
        aria-labelledby="review-dialog-title"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8d0c8] px-5 py-4">
          <div>
            <h2 id="review-dialog-title" className="text-base font-bold text-[#3a302a]">
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

export default function AdminGuestReviewsPage() {
  const { user } = useAuth();
  const canView = can(user?.permissions, ADMIN_PERMISSIONS.REVIEWS_VIEW);
  const canModerate = can(user?.permissions, ADMIN_PERMISSIONS.REVIEWS_MODERATE);

  const [reviews, setReviews] = useState<AdminGuestReview[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [draft, setDraft] = useState({ q: '', status: 'all', reported: false });
  const [applied, setApplied] = useState({ q: '', status: 'all', reported: false });
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminGuestReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [moderateTarget, setModerateTarget] = useState<AdminGuestReview | null>(null);
  const [moderateAction, setModerateAction] = useState<'hide' | 'restore'>('hide');
  const [moderateReason, setModerateReason] = useState('');
  const [moderateSubmitting, setModerateSubmitting] = useState(false);
  const [moderateError, setModerateError] = useState<string | null>(null);

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
        if (applied.reported) params.set('reported', 'true');

        const data = await apiFetch<PaginatedAdminGuestReviews>(
          `/admin/guest-reviews?${params.toString()}`,
        );
        if (cancelled) return;
        setReviews(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (page > data.totalPages) setPage(data.totalPages || 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load guest reviews');
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
    setDraft({ q: '', status: 'all', reported: false });
    setApplied({ q: '', status: 'all', reported: false });
    setPage(1);
  };

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await apiFetch<AdminGuestReviewDetail>(`/admin/guest-reviews/${id}`);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load this review');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openModerateDialog = (review: AdminGuestReview) => {
    setModerateTarget(review);
    setModerateAction(review.moderationStatus === 'VISIBLE' ? 'hide' : 'restore');
    setModerateReason('');
    setModerateError(null);
  };

  const submitModeration = async () => {
    if (!moderateTarget) return;
    if (moderateReason.trim().length < 5) {
      setModerateError('Add a short reason (at least 5 characters).');
      return;
    }

    setModerateSubmitting(true);
    setModerateError(null);
    try {
      await apiFetch(`/admin/guest-reviews/${moderateTarget.id}/${moderateAction}`, {
        method: 'POST',
        body: JSON.stringify({ reason: moderateReason.trim() }),
      });
      setToast({
        type: 'success',
        message:
          moderateAction === 'hide'
            ? 'Review hidden from public view.'
            : 'Review restored to public view.',
      });
      setModerateTarget(null);
      setDetailOpen(false);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setModerateError(err instanceof Error ? err.message : 'Could not update the review');
    } finally {
      setModerateSubmitting(false);
    }
  };

  const hasFilters =
    Boolean(applied.q) || applied.status !== 'all' || applied.reported;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Guest reviews"
        description="Hide reviews that break platform standards or restore them after review. Hidden reviews disappear from public listings and host dashboards."
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
          Your role does not include permission to view guest reviews.
        </div>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-[#d8d0c8] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6b5f]" />
                <input
                  type="search"
                  value={draft.q}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, q: event.target.value }))
                  }
                  placeholder="Search comment, author or listing"
                  className="h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] pl-9 pr-3 text-sm text-[#4a3e35] outline-none transition focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                />
              </div>

              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
                className="h-10 rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#5a4c42] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                aria-label="Filter by visibility"
              >
                <option value="all">All visibility</option>
                <option value="VISIBLE">Visible</option>
                <option value="HIDDEN">Hidden</option>
              </select>

              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#5a4c42]">
                <input
                  type="checkbox"
                  checked={draft.reported}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, reported: event.target.checked }))
                  }
                  className="h-4 w-4 accent-[#b3541e]"
                />
                Has open reports
              </label>

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
                  disabled={!hasFilters && !draft.q && draft.status === 'all' && !draft.reported}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white px-3 text-sm font-semibold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7a6b5f]">
                {total.toLocaleString()} review{total === 1 ? '' : 's'}
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
                <p className="font-semibold">Could not load guest reviews</p>
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
                    {['Review', 'Listing', 'Reports', 'Visibility', 'Written', 'Actions'].map(
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
                  {loading && reviews.length === 0
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
                    : reviews.map((review) => (
                        <tr key={review.id} className="hover:bg-[#f6f0e8]/70">
                          <td className="max-w-[360px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f7ebda] text-[#8a5e20]">
                                <Star className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Rating value={review.rating} />
                                  <span className="text-xs font-semibold text-[#5a4c42]">
                                    {review.author?.name || 'Deleted user'}
                                  </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-[#7a6b5f]">
                                  {review.comment || 'No comment provided.'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[220px] truncate text-xs font-semibold text-[#5a4c42]">
                              {review.property?.title || 'Listing unavailable'}
                            </p>
                            <p className="mt-0.5 text-xs text-[#7a6b5f]">
                              {review.property?.city || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {review.openReportCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#ecd0c9] bg-[#f8e9e5] px-2.5 py-1 text-xs font-bold text-[#8f4035]">
                                <Flag className="h-3 w-3" />
                                {review.openReportCount} open
                              </span>
                            ) : (
                              <span className="text-xs text-[#7a6b5f]">None</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                review.moderationStatus === 'VISIBLE'
                                  ? 'bg-[#edf1e8] text-[#4f6648]'
                                  : 'bg-[#efe7dc] text-[#6c5d52]'
                              }`}
                            >
                              {review.moderationStatus === 'VISIBLE' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                              {review.moderationStatus === 'VISIBLE' ? 'Visible' : 'Hidden'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-[#7a6b5f]">
                            {formatDate(review.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(review.id)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#b3541e] hover:bg-[#b3541e]/5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                              {canModerate && (
                                <button
                                  type="button"
                                  onClick={() => openModerateDialog(review)}
                                  className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold ${
                                    review.moderationStatus === 'VISIBLE'
                                      ? 'text-[#a24b3e] hover:bg-[#f8e9e5]'
                                      : 'text-[#5d7554] hover:bg-[#edf1e8]'
                                  }`}
                                >
                                  {review.moderationStatus === 'VISIBLE' ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  {review.moderationStatus === 'VISIBLE' ? 'Hide' : 'Restore'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!loading && reviews.length === 0 && !error && (
              <div className="px-6 py-14 text-center">
                <Star className="mx-auto h-10 w-10 text-[#c2b6aa]" />
                <h2 className="mt-3 font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">No reviews found</h2>
                <p className="mt-1 text-sm text-[#7a6b5f]">
                  {hasFilters ? 'No reviews match these filters.' : 'Guest reviews will appear here.'}
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
                  'No reviews to display'
                ) : (
                  <>
                    Page {page} of {totalPages} · {total.toLocaleString()} review
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
        title="Review details"
        description="Guest feedback, moderation history and linked reports."
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
            {detail && canModerate && (
              <button
                type="button"
                onClick={() => openModerateDialog(detail)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                  detail.moderationStatus === 'VISIBLE'
                    ? 'bg-[#a24b3e] hover:bg-[#8f4035]'
                    : 'bg-[#5d7554] hover:bg-[#4f6648]'
                }`}
              >
                {detail.moderationStatus === 'VISIBLE' ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {detail.moderationStatus === 'VISIBLE' ? 'Hide review' : 'Restore review'}
              </button>
            )}
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-14 text-[#7a6b5f]">
            <Loader2 className="h-6 w-6 animate-spin text-[#b3541e]" />
            <p className="mt-2 text-sm font-medium">Loading review…</p>
          </div>
        ) : detailError ? (
          <div className="rounded-xl border border-[#ecd0c9] bg-[#f8e9e5] p-4 text-sm text-[#8f4035]">
            <p className="font-semibold">Could not load review</p>
            <p className="mt-1">{detailError}</p>
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Rating value={detail.rating} />
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    detail.moderationStatus === 'VISIBLE'
                      ? 'bg-[#edf1e8] text-[#4f6648]'
                      : 'bg-[#e7ded2] text-[#5a4c42]'
                  }`}
                >
                  {detail.moderationStatus === 'VISIBLE' ? 'Visible' : 'Hidden'}
                </span>
                <span className="text-xs text-[#7a6b5f]">
                  {detail.author?.name || 'Deleted user'}
                  {detail.author?.email ? ` · ${detail.author.email}` : ''}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#5a4c42]">
                {detail.comment || 'No comment provided.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7a6b5f]">
                <span>Written {formatDate(detail.createdAt)}</span>
                {detail.property && (
                  <span>
                    Listing: {detail.property.title} · {detail.property.city}
                  </span>
                )}
                <span>Review ID: {detail.id}</span>
              </div>
            </div>

            {detail.moderationStatus === 'HIDDEN' && (
              <div className="rounded-xl border border-[#ecd9c2] bg-[#f7ebda] p-4 text-xs text-[#7a531c]">
                <p className="font-bold">Moderation note</p>
                <p className="mt-1">{detail.moderationReason || 'No reason recorded.'}</p>
                {detail.moderatedAt && (
                  <p className="mt-1.5 text-[#8a5e20]">
                    Hidden {formatDate(detail.moderatedAt)}
                    {detail.moderatedBy ? ` by ${detail.moderatedBy.name}` : ''}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#4a3e35]">Reports on this review</h3>
                <span className="text-xs font-semibold text-[#7a6b5f]">
                  {detail.reports.length} report{detail.reports.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-2 space-y-2">
                {detail.reports.length === 0 ? (
                  <p className="rounded-xl border border-[#d8d0c8] p-3 text-xs text-[#7a6b5f]">
                    No reports have been filed for this review.
                  </p>
                ) : (
                  detail.reports.map((report) => (
                    <div key={report.id} className="rounded-xl border border-[#d8d0c8] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#4a3e35]">
                          {REPORT_REASON_LABELS[report.reason] || report.reason}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${reportStatusClasses(
                            report.status,
                          )}`}
                        >
                          {REPORT_STATUS_LABELS[report.status] || report.status}
                        </span>
                        <span className="text-xs text-[#7a6b5f]">
                          {report.reporterEmail || 'Unknown reporter'} ·{' '}
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                      {report.details && (
                        <p className="mt-1.5 text-xs text-[#6c5d52]">{report.details}</p>
                      )}
                      {report.resolutionNote && (
                        <p className="mt-1.5 rounded-lg bg-[#f6f0e8] px-2.5 py-2 text-xs text-[#6c5d52]">
                          Resolution: {report.resolutionNote}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(moderateTarget)}
        onClose={() => setModerateTarget(null)}
        title={moderateAction === 'hide' ? 'Hide review' : 'Restore review'}
        description={
          moderateTarget
            ? `${moderateTarget.author?.name || 'Deleted user'} · ${
                moderateTarget.property?.title || 'Listing unavailable'
              }`
            : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModerateTarget(null)}
              disabled={moderateSubmitting}
              className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitModeration}
              disabled={moderateSubmitting || moderateReason.trim().length < 5}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                moderateAction === 'hide'
                  ? 'bg-[#a24b3e] hover:bg-[#8f4035]'
                  : 'bg-[#5d7554] hover:bg-[#4f6648]'
              }`}
            >
              {moderateSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : moderateAction === 'hide' ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {moderateAction === 'hide' ? 'Hide review' : 'Restore review'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
              moderateAction === 'hide'
                ? 'bg-[#f8e9e5] text-[#8f4035]'
                : 'bg-[#edf1e8] text-[#4f6648]'
            }`}
          >
            {moderateAction === 'hide' ? (
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>
              {moderateAction === 'hide'
                ? 'The review will be removed from the public listing and host dashboard. The author is notified with this reason.'
                : 'The review will be visible again on the public listing and host dashboard. The author is notified.'}
            </p>
          </div>

          <div>
            <label htmlFor="moderation-reason" className="text-xs font-bold text-[#5a4c42]">
              Reason <span className="text-[#a24b3e]">*</span>
            </label>
            <textarea
              id="moderation-reason"
              value={moderateReason}
              onChange={(event) => setModerateReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What policy does this review break? This goes to the audit log."
              className="mt-1.5 w-full resize-none rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 py-2.5 text-sm text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
            />
            <div className="mt-1 flex justify-between text-xs text-[#7a6b5f]">
              <span>Minimum 5 characters</span>
              <span>{moderateReason.length}/500</span>
            </div>
          </div>

          {moderateError && (
            <p className="rounded-lg bg-[#f8e9e5] px-3 py-2 text-xs font-medium text-[#8f4035]">
              {moderateError}
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
