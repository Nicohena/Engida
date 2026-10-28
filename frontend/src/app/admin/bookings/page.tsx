'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Ban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminDialog from '../../../components/admin/AdminDialog';
import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import AdminPagination from '../../../components/admin/AdminPagination';
import AdminStatusBadge from '../../../components/admin/AdminStatusBadge';
import { apiFetch, downloadAuthedFile } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { ADMIN_PERMISSIONS, can } from '../../../types/admin';
import {
  BOOKING_STATUS_LABELS,
  CASE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatMoney,
  relativeTime,
  shortDate,
  shortDateTime,
  type AdminBookingDetail,
  type AdminBookingsResponse,
  type AdminBookingSummary,
  type AvailabilityBlock,
  type BookingStatus,
  type CancellationPreview,
  type CancellationRequest,
  type CancellationRequestSource,
  type PaymentStatus,
} from '../../../types/admin-phase2';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | BookingStatus;
type PaymentFilter = 'all' | PaymentStatus;
type DetailTab = 'stay' | 'timeline' | 'cancellation' | 'availability';

interface StatusAction {
  status: BookingStatus;
  title: string;
  description: string;
}

const STATUS_ACTIONS: Partial<Record<BookingStatus, StatusAction>> = {
  CONFIRMED: {
    status: 'CONFIRMED',
    title: 'Confirm reservation',
    description: 'Confirm that the host has accepted this stay. The guest and host will be notified.',
  },
  CANCELLED: {
    status: 'CANCELLED',
    title: 'Cancel reservation',
    description: 'Cancelling is a status correction only. No refund is issued from this console.',
  },
  COMPLETED: {
    status: 'COMPLETED',
    title: 'Mark stay complete',
    description: 'Close the reservation after check-out. This cannot be reversed.',
  },
};

const STATUS_TONES: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'neutral',
};

const PAYMENT_TONES: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  ON_ARRIVAL: 'neutral',
  REFUNDED: 'danger',
  FAILED: 'danger',
};

function formatStayDate(value: string): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return shortDate(value);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function initials(name: string | null | undefined): string {
  return (name || 'Guest')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.BOOKINGS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>('all');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<AdminBookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminBookingDetail | null>(null);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const deepLinkBookingRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('stay');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSource, setCancelSource] = useState<CancellationRequestSource>('GUEST');
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationKey, setCancellationKey] = useState('');

  const [decision, setDecision] = useState<{ request: CancellationRequest; action: 'approve' | 'reject' } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (status !== 'all') params.set('status', status);
    if (paymentStatus !== 'all') params.set('paymentStatus', paymentStatus);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    return params.toString();
  }, [debouncedSearch, status, paymentStatus, page]);

  const loadList = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setListError(null);
    try {
      const data = await apiFetch<AdminBookingsResponse>(`/admin/bookings?${listQuery}`);
      setResult(data);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'The reservation ledger could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [listQuery]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadList();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [booking, cancellation] = await Promise.all([
        apiFetch<AdminBookingDetail>(`/admin/bookings/${id}`),
        apiFetch<CancellationPreview>(`/admin/bookings/${id}/cancellation-preview`).catch(() => null),
      ]);
      setDetail(booking);
      setPreview(cancellation);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'The reservation record could not be loaded');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => {
        setDetail(null);
        setPreview(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      void loadDetail(selectedId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!result?.data.length) return;
    if (selectedId && result.data.some((booking) => booking.id === selectedId)) return;
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches;
    const timer = window.setTimeout(() => {
      if (isDesktop && !selectedId) {
        setSelectedId(result.data[0].id);
      } else if (
        selectedId &&
        !result.data.some((booking) => booking.id === selectedId) &&
        selectedId !== deepLinkBookingRef.current
      ) {
        setSelectedId(isDesktop ? result.data[0].id : null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [result, selectedId]);

  useEffect(() => {
    const linkedBooking = new URLSearchParams(window.location.search).get('booking');
    if (!linkedBooking) return;
    deepLinkBookingRef.current = linkedBooking;
    const timer = window.setTimeout(() => {
      setSelectedId(linkedBooking);
      if (window.matchMedia('(max-width: 1023px)').matches) {
        setMobileDetailOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectBooking = (booking: AdminBookingSummary) => {
    setSelectedId(booking.id);
    setActiveTab('stay');
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      setMobileDetailOpen(true);
    }
  };

  const refresh = async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  };

  const submitStatus = async () => {
    if (!statusAction || !detail) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminBookingDetail>(`/admin/bookings/${detail.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: statusAction.status, reason: statusReason.trim() }),
      });
      setDetail(updated);
      setStatusAction(null);
      setStatusReason('');
      setToast({ message: `Reservation updated to ${BOOKING_STATUS_LABELS[statusAction.status].toLowerCase()}.`, tone: 'success' });
      await loadList();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The status could not be updated', tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const openCancellation = () => {
    setCancelReason('');
    setCancelSource('GUEST');
    setCancellationKey(crypto.randomUUID());
    setCancelOpen(true);
  };

  const submitCancellation = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/bookings/${detail.id}/cancellation-requests`, {
        method: 'POST',
        body: JSON.stringify({
          source: cancelSource,
          reason: cancelReason.trim(),
          idempotencyKey: cancellationKey,
        }),
      });
      setCancelOpen(false);
      setToast({ message: 'Cancellation request recorded for review.', tone: 'success' });
      await refresh();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The request could not be recorded', tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecision = async () => {
    if (!detail || !decision) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/bookings/${detail.id}/cancellation-requests/${decision.request.id}/${decision.action}`, {
        method: 'POST',
        body: JSON.stringify({ note: decisionNote.trim() || undefined }),
      });
      setDecision(null);
      setDecisionNote('');
      setToast({
        message: decision.action === 'approve' ? 'Cancellation approved. No refund was moved.' : 'Cancellation request declined.',
        tone: 'success',
      });
      await refresh();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The decision could not be recorded', tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitBlock = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await apiFetch(`/admin/bookings/${detail.id}/availability-blocks`, {
        method: 'POST',
        body: JSON.stringify({
          propertyId: detail.property?.id,
          startDate: blockStart,
          endDate: blockEnd,
          reason: blockReason.trim(),
        }),
      });
      setBlockOpen(false);
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      setToast({ message: 'Admin date block added.', tone: 'success' });
      await loadDetail(detail.id);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The block could not be added', tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeBlock = async (block: AvailabilityBlock) => {
    if (!detail) return;
    if (!window.confirm(`Remove the admin block from ${formatStayDate(block.startDate)} to ${formatStayDate(block.endDate)}?`)) {
      return;
    }
    try {
      await apiFetch(`/admin/bookings/availability-blocks/${block.id}`, { method: 'DELETE' });
      setToast({ message: 'Admin date block removed.', tone: 'success' });
      await loadDetail(detail.id);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The block could not be removed', tone: 'danger' });
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams(listQuery);
      params.delete('page');
      params.delete('limit');
      await downloadAuthedFile(
        `/admin/bookings/export.csv?${params.toString()}`,
        'engida-bookings.csv',
      );
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'The export could not be prepared', tone: 'danger' });
    }
  };

  const pendingCancellation = detail?.cancellationRequests.find((request) => request.status === 'REQUESTED');
  const counts = result?.counts;

  const detailPanel = detail ? (
    <BookingDetail
      detail={detail}
      preview={preview}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      canManage={canManage}
      pendingCancellation={pendingCancellation}
      onStatusAction={setStatusAction}
      onRecordCancellation={openCancellation}
      onDecision={(request, action) => {
        setDecision({ request, action });
        setDecisionNote(request.decisionNote || '');
      }}
      onAddBlock={() => {
        setBlockStart(detail.checkInDate);
        setBlockEnd(detail.checkOutDate);
        setBlockReason('');
        setBlockOpen(true);
      }}
      onRemoveBlock={removeBlock}
    />
  ) : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Bookings"
        description="A working ledger of every stay: inspect the record, correct a status with a reason, record cancellation requests, and resolve availability conflicts. Money never moves here."
        actions={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void exportCsv()}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Export CSV
            </button>
          </>
        }
      />

      <section className="admin-stats-strip" aria-label="Booking ledger summary">
        <div className="admin-stat">
          <p className="admin-stat-label">Awaiting host</p>
          <p className="admin-stat-value">{counts?.PENDING ?? '—'}</p>
          <p className="admin-stat-note">Need a host decision</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Confirmed</p>
          <p className="admin-stat-value">{counts?.CONFIRMED ?? '—'}</p>
          <p className="admin-stat-note">Stays on the books</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Completed</p>
          <p className="admin-stat-value">{counts?.COMPLETED ?? '—'}</p>
          <p className="admin-stat-note">Closed after check-out</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Ledger rows</p>
          <p className="admin-stat-value">{result?.total?.toLocaleString('en-US') ?? '—'}</p>
          <p className="admin-stat-note">Matching current filters</p>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search />
          <input
            className="admin-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reference, guest, host, property or city"
            aria-label="Search reservations"
          />
        </div>
        <select
          className="admin-select w-auto min-w-[9.5rem]"
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value as PaymentFilter);
            setPage(1);
          }}
          aria-label="Filter by payment status"
        >
          <option value="all">All payments</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="admin-filter-row" role="group" aria-label="Booking status filters">
        {([
          ['all', 'All stays', result?.total ?? 0],
          ['PENDING', 'Awaiting host', counts?.PENDING ?? 0],
          ['CONFIRMED', 'Confirmed', counts?.CONFIRMED ?? 0],
          ['COMPLETED', 'Completed', counts?.COMPLETED ?? 0],
          ['CANCELLED', 'Cancelled', counts?.CANCELLED ?? 0],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            className="admin-filter"
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            {label}
            <span className="admin-filter-count">{count}</span>
          </button>
        ))}
      </div>

      {listError ? (
        <div className="flex items-start gap-3 border border-[#ebd0c9] bg-[#f8e9e5] px-4 py-3 text-sm text-[#7d3328]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">The ledger could not be loaded</p>
            <p className="mt-0.5 text-xs leading-5">{listError}</p>
          </div>
        </div>
      ) : null}

      <div className="admin-split">
        <div className="admin-split-main">
          <div className="admin-workbench-head">
            <div>
              <h2 className="font-headline text-[1.35rem] font-semibold leading-tight text-[#3a302a]">
                Stay ledger
              </h2>
              <p className="mt-0.5 text-xs text-[#78706a]">
                Newest requests first. Select a row to open its record.
              </p>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#78706a]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
              </span>
            ) : null}
          </div>

          {loading && !result ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="admin-skeleton h-14 w-full" />
              ))}
            </div>
          ) : result?.data.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="admin-ledger">
                  <thead>
                    <tr>
                      <th>Reservation</th>
                      <th>Guest &amp; stay</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((booking) => {
                      const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
                      return (
                        <tr
                          key={booking.id}
                          aria-selected={booking.id === selectedId}
                          tabIndex={0}
                          onClick={() => selectBooking(booking)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              selectBooking(booking);
                            }
                          }}
                        >
                          <td>
                            <p className="admin-ledger-ref">{booking.reference}</p>
                            <p className="admin-ledger-sub">Booked {shortDate(booking.createdAt)}</p>
                          </td>
                          <td>
                            <p className="admin-ledger-main">{booking.guest?.name || 'Guest'}</p>
                            <p className="admin-ledger-sub max-w-[16rem] truncate">
                              {booking.property?.title || 'Property'}
                              {booking.property?.city ? ` · ${booking.property.city}` : ''}
                            </p>
                          </td>
                          <td className="whitespace-nowrap">
                            <p className="text-xs font-semibold text-[#3a302a]">{formatStayDate(booking.checkInDate)}</p>
                            <p className="admin-ledger-sub">
                              {nights} night{nights === 1 ? '' : 's'} · {booking.guestCount} guest{booking.guestCount === 1 ? '' : 's'}
                            </p>
                          </td>
                          <td>
                            <AdminStatusBadge
                              label={BOOKING_STATUS_LABELS[booking.status]}
                              tone={STATUS_TONES[booking.status]}
                              dot
                            />
                          </td>
                          <td>
                            <AdminStatusBadge
                              label={PAYMENT_STATUS_LABELS[booking.paymentStatus]}
                              tone={PAYMENT_TONES[booking.paymentStatus]}
                            />
                          </td>
                          <td className="text-right">
                            <p className="admin-numeric text-xs font-bold text-[#3a302a]">
                              {formatMoney(booking.totalPrice, booking.paymentCurrency)}
                            </p>
                            <p className="admin-ledger-sub">{PAYMENT_METHOD_LABELS[booking.paymentMethod]}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <AdminPagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                onChange={setPage}
                itemLabel="reservations"
              />
            </>
          ) : (
            <AdminEmptyState
              title="No reservations in this view"
              copy="Try a different search term or clear the status filter. New guest requests will appear here immediately."
              icon={<CalendarDays className="h-4 w-4" />}
              action={
                status !== 'all' || paymentStatus !== 'all' || search ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => {
                      setSearch('');
                      setStatus('all');
                      setPaymentStatus('all');
                    }}
                  >
                    Clear filters
                  </button>
                ) : null
              }
            />
          )}
        </div>

        <aside className="admin-detail-rail hidden lg:block" aria-label="Selected reservation record">
          {detailLoading && !detail ? (
            <div className="space-y-3 p-5">
              <div className="admin-skeleton h-8 w-2/3" />
              <div className="admin-skeleton h-4 w-1/2" />
              <div className="admin-skeleton mt-6 h-48 w-full" />
            </div>
          ) : detail ? (
            detailPanel
          ) : (
            <AdminEmptyState
              title="Select a reservation"
              copy="The record opens here with the guest, stay, status history, cancellation policy and availability."
              icon={<ArrowRight className="h-4 w-4" />}
            />
          )}
        </aside>
      </div>

      <AdminDialog
        open={mobileDetailOpen && Boolean(detail || detailLoading)}
        onClose={() => setMobileDetailOpen(false)}
        title={detail?.reference || 'Reservation record'}
        description={detail?.property?.title || 'Loading reservation'}
        width="lg"
      >
        {detailLoading && !detail ? (
          <div className="space-y-3">
            <div className="admin-skeleton h-8 w-2/3" />
            <div className="admin-skeleton h-48 w-full" />
          </div>
        ) : detailError ? (
          <p className="text-sm text-[#9a3f33]">{detailError}</p>
        ) : (
          detailPanel
        )}
      </AdminDialog>

      <AdminDialog
        open={Boolean(statusAction)}
        onClose={() => {
          if (submitting) return;
          setStatusAction(null);
          setStatusReason('');
        }}
        title={statusAction?.title || 'Correct status'}
        description={statusAction?.description}
        footer={
          <>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setStatusAction(null)}
              disabled={submitting}
            >
              Keep as is
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitStatus()}
              disabled={submitting || statusReason.trim().length < 10}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save correction
            </button>
          </>
        }
      >
        <label className="admin-field-label" htmlFor="booking-status-reason">
          Reason for the correction
        </label>
        <textarea
          id="booking-status-reason"
          className="admin-textarea"
          value={statusReason}
          onChange={(event) => setStatusReason(event.target.value)}
          placeholder="At least 10 characters. This reason is stored in the reservation history and audit log."
          rows={4}
        />
        <p className="admin-reply-hint mt-2">
          {statusAction?.status === 'CANCELLED'
            ? 'No refund, payout or payment transaction will be created.'
            : 'The guest and host receive the normal reservation notification.'}
        </p>
      </AdminDialog>

      <AdminDialog
        open={cancelOpen}
        onClose={() => {
          if (submitting) return;
          setCancelOpen(false);
        }}
        title="Record a cancellation request"
        description="Capture the request now. Approving it later cancels the stay; this console never moves money."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setCancelOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitCancellation()}
              disabled={submitting || cancelReason.trim().length < 10}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Record request
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <label className="admin-field-label" htmlFor="cancel-source">Requested by</label>
            <select
              id="cancel-source"
              className="admin-select"
              value={cancelSource}
              onChange={(event) => setCancelSource(event.target.value as CancellationRequestSource)}
            >
              <option value="GUEST">Guest</option>
              <option value="HOST">Host</option>
              <option value="ADMIN">Admin note</option>
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="cancel-reason">What did they ask?</label>
            <textarea
              id="cancel-reason"
              className="admin-textarea"
              rows={4}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="At least 10 characters. Include the reason given so the decision has context."
            />
          </div>
        </div>
        {preview ? (
          <div className="mt-4 border-t border-[#d8d0c8] pt-3">
            <p className="text-xs font-bold text-[#3a302a]">
              {preview.policyLabel} policy · {preview.refundPercent}% estimated refund
            </p>
            <p className="mt-1 text-xs leading-5 text-[#605850]">{preview.rule}</p>
            <p className="mt-1 text-xs text-[#78706a]">
              Estimate {formatMoney(preview.refundAmount, preview.currency)} · no money is moved.
            </p>
          </div>
        ) : null}
      </AdminDialog>

      <AdminDialog
        open={Boolean(decision)}
        onClose={() => {
          if (submitting) return;
          setDecision(null);
          setDecisionNote('');
        }}
        title={decision?.action === 'approve' ? 'Approve cancellation' : 'Decline cancellation'}
        description={
          decision?.action === 'approve'
            ? 'This cancels the reservation and records the policy estimate. No refund is issued.'
            : 'The stay remains active. Explain the decision for the record.'
        }
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setDecision(null)} disabled={submitting}>
              Back
            </button>
            <button
              type="button"
              className={`admin-btn ${decision?.action === 'approve' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => void submitDecision()}
              disabled={submitting || (decision?.action === 'reject' && decisionNote.trim().length < 5)}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {decision?.action === 'approve' ? 'Approve and cancel' : 'Decline request'}
            </button>
          </>
        }
      >
        {decision ? (
          <div className="mb-4 border-l-2 border-[#b3541e] pl-3">
            <p className="text-xs font-bold text-[#3a302a]">{decision.request.source} · {formatMoney(decision.request.estimatedRefundAmount, decision.request.currency)}</p>
            <p className="mt-1 text-xs leading-5 text-[#605850]">{decision.request.reason}</p>
          </div>
        ) : null}
        <label className="admin-field-label" htmlFor="decision-note">
          Decision note {decision?.action === 'approve' ? '(optional)' : ''}
        </label>
        <textarea
          id="decision-note"
          className="admin-textarea"
          rows={4}
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder={decision?.action === 'reject' ? 'Explain why the request is declined.' : 'Add context for finance and the audit trail.'}
        />
      </AdminDialog>

      <AdminDialog
        open={blockOpen}
        onClose={() => {
          if (submitting) return;
          setBlockOpen(false);
        }}
        title="Add an admin date block"
        description="Block the property calendar for maintenance or an operational hold. Existing reservations cannot be blocked."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setBlockOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitBlock()}
              disabled={submitting || !blockStart || !blockEnd || blockReason.trim().length < 5}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Add block
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-field-label" htmlFor="block-start">Start date</label>
            <input id="block-start" type="date" className="admin-input" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} />
          </div>
          <div>
            <label className="admin-field-label" htmlFor="block-end">End date</label>
            <input id="block-end" type="date" className="admin-input" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="admin-field-label" htmlFor="block-reason">Operational reason</label>
          <input
            id="block-reason"
            className="admin-input"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            placeholder="Maintenance, owner hold, safety inspection…"
          />
        </div>
      </AdminDialog>

      {toast ? (
        <div className="admin-toast" data-tone={toast.tone} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

interface BookingDetailProps {
  detail: AdminBookingDetail;
  preview: CancellationPreview | null;
  activeTab: DetailTab;
  canManage: boolean;
  pendingCancellation?: CancellationRequest;
  onTabChange: (tab: DetailTab) => void;
  onStatusAction: (action: StatusAction) => void;
  onRecordCancellation: () => void;
  onDecision: (request: CancellationRequest, action: 'approve' | 'reject') => void;
  onAddBlock: () => void;
  onRemoveBlock: (block: AvailabilityBlock) => void;
}

function BookingDetail({
  detail,
  preview,
  activeTab,
  canManage,
  pendingCancellation,
  onTabChange,
  onStatusAction,
  onRecordCancellation,
  onDecision,
  onAddBlock,
  onRemoveBlock,
}: BookingDetailProps) {
  const nights = nightsBetween(detail.checkInDate, detail.checkOutDate);

  return (
    <div>
      <div className="admin-rail-head">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#78706a]">Reservation record</p>
            <h2 className="mt-1 truncate font-headline text-[1.65rem] font-semibold leading-none text-[#3a302a]">
              {detail.reference}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-[#605850]">
              {detail.property?.title || 'Property'} · {detail.property?.city || '—'}
            </p>
          </div>
          <AdminStatusBadge label={BOOKING_STATUS_LABELS[detail.status]} tone={STATUS_TONES[detail.status]} dot />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {detail.allowedTransitions.map((next) => {
            const action = STATUS_ACTIONS[next];
            if (!action) return null;
            const primary = next === 'CONFIRMED';
            return (
              <button
                key={next}
                type="button"
                className={`admin-btn h-8 min-h-8 px-2.5 text-[11px] ${primary ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                onClick={() => onStatusAction(action)}
                disabled={!canManage}
                title={canManage ? undefined : 'Your role cannot change reservations'}
              >
                {next === 'CANCELLED' ? <Ban className="h-3 w-3" /> : next === 'COMPLETED' ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {action.title}
              </button>
            );
          })}
          {!canManage ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78706a]">Read only</span>
          ) : null}
        </div>
      </div>

      <div className="admin-tabs px-3" role="tablist" aria-label="Reservation record sections">
        {([
          ['stay', 'Stay'],
          ['timeline', 'Timeline'],
          ['cancellation', 'Cancellation'],
          ['availability', 'Availability'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            className="admin-tab"
            onClick={() => onTabChange(value)}
          >
            {label}
            {value === 'cancellation' && pendingCancellation ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#b3541e]" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="admin-rail-body">
        {activeTab === 'stay' ? (
          <div className="space-y-5">
            <section>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a302a] text-[10px] font-bold text-[#faf5ee]">
                  {initials(detail.guest?.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#3a302a]">{detail.guest?.name || 'Guest'}</p>
                  <p className="truncate text-xs text-[#78706a]">{detail.guest?.email || 'No email on file'}</p>
                </div>
              </div>
              <div className="admin-meta-grid mt-3">
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Check-in</p>
                  <p className="admin-meta-value">{formatStayDate(detail.checkInDate)}</p>
                </div>
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Check-out</p>
                  <p className="admin-meta-value">{formatStayDate(detail.checkOutDate)}</p>
                </div>
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Stay</p>
                  <p className="admin-meta-value">{nights} night{nights === 1 ? '' : 's'} · {detail.guestCount} guest{detail.guestCount === 1 ? '' : 's'}</p>
                </div>
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Total</p>
                  <p className="admin-meta-value admin-numeric">{formatMoney(detail.totalPrice, detail.paymentCurrency)}</p>
                </div>
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Payment</p>
                  <p className="admin-meta-value">{PAYMENT_STATUS_LABELS[detail.paymentStatus]} · {PAYMENT_METHOD_LABELS[detail.paymentMethod]}</p>
                </div>
                <div className="admin-meta-cell">
                  <p className="admin-meta-label">Policy</p>
                  <p className="admin-meta-value">{detail.cancellationPolicy.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())}</p>
                </div>
              </div>
            </section>

            <section className="border-t border-[#d8d0c8] pt-4">
              <p className="admin-meta-label">Host</p>
              <p className="mt-1 text-sm font-bold text-[#3a302a]">{detail.host?.name || '—'}</p>
              <p className="text-xs text-[#78706a]">{detail.host?.email || '—'}</p>
              <p className="mt-2 text-xs leading-5 text-[#605850]">
                {detail.property?.address || 'Address unavailable'}
              </p>
            </section>

            <section className="border-t border-[#d8d0c8] pt-4">
              <p className="admin-meta-label">Booked</p>
              <p className="mt-1 text-xs leading-5 text-[#605850]">{shortDateTime(detail.createdAt)} · {relativeTime(detail.createdAt)}</p>
              {detail.cancellation.reason ? (
                <p className="mt-2 text-xs leading-5 text-[#9a3f33]">
                  Cancelled {shortDateTime(detail.cancellation.cancelledAt)}: {detail.cancellation.reason}
                </p>
              ) : null}
            </section>

            <section className="border-t border-[#d8d0c8] pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="admin-meta-label">Linked cases</p>
                <a href="/admin/cases" className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b3541e]">Open desk</a>
              </div>
              {detail.cases.length ? (
                <ul className="mt-2 space-y-2">
                  {detail.cases.map((linked) => (
                    <li key={linked.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={`/admin/cases?case=${linked.id}`}
                          className="truncate text-xs font-bold text-[#3a302a] hover:text-[#b3541e]"
                        >
                          {linked.number}
                        </a>
                        <p className="truncate text-xs text-[#78706a]">{linked.subject}</p>
                      </div>
                      <AdminStatusBadge label={CASE_STATUS_LABELS[linked.status]} tone={linked.status === 'OPEN' ? 'warning' : linked.status === 'CLOSED' ? 'neutral' : 'accent'} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#78706a]">No support case is linked to this stay.</p>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'timeline' ? (
          <div>
            {detail.statusHistory.length ? (
              <ol className="admin-timeline">
                {detail.statusHistory.map((entry) => (
                  <li key={entry.id} className="admin-timeline-item">
                    <span className="admin-timeline-dot" />
                    <div className="admin-timeline-copy">
                      <p className="admin-timeline-title">
                        {entry.fromStatus ? `${BOOKING_STATUS_LABELS[entry.fromStatus]} → ` : 'Created as '}
                        {BOOKING_STATUS_LABELS[entry.toStatus]}
                      </p>
                      <p className="admin-timeline-meta">
                        {shortDateTime(entry.createdAt)} · {entry.source.toLowerCase()}
                        {entry.actor ? ` · ${entry.actor.name}` : ''}
                      </p>
                      {entry.reason ? <p className="admin-timeline-meta">“{entry.reason}”</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#605850]">No status history was recorded before this console existed.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'cancellation' ? (
          <div className="space-y-5">
            <section>
              <p className="admin-meta-label">Policy estimate</p>
              {preview ? (
                <>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-headline text-2xl font-semibold text-[#3a302a]">{preview.refundPercent}%</p>
                      <p className="text-xs text-[#78706a]">{preview.policyLabel} policy</p>
                    </div>
                    <p className="admin-numeric text-sm font-bold text-[#3a302a]">{formatMoney(preview.refundAmount, preview.currency)}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#605850]">{preview.rule}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#78706a]">
                    Estimate only · no refund or PSP action
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-[#78706a]">Estimate unavailable for this reservation.</p>
              )}
            </section>

            {pendingCancellation ? (
              <section className="border-t border-[#d8d0c8] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="admin-meta-label">Open request</p>
                  <AdminStatusBadge label="Needs decision" tone="warning" dot />
                </div>
                <p className="mt-2 text-xs leading-5 text-[#605850]">{pendingCancellation.reason}</p>
                <p className="mt-1 text-[10px] text-[#78706a]">
                  Recorded by {pendingCancellation.requestedBy?.name || 'admin'} · {shortDateTime(pendingCancellation.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" className="admin-btn admin-btn-primary h-8 min-h-8 px-2.5 text-[11px]" onClick={() => onDecision(pendingCancellation, 'approve')}>
                    Approve
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 px-2.5 text-[11px]" onClick={() => onDecision(pendingCancellation, 'reject')}>
                    Decline
                  </button>
                </div>
              </section>
            ) : canManage && detail.status !== 'CANCELLED' && detail.status !== 'COMPLETED' ? (
              <button type="button" className="admin-btn admin-btn-secondary w-full" onClick={onRecordCancellation}>
                <Plus className="h-3.5 w-3.5" /> Record cancellation request
              </button>
            ) : null}

            {detail.cancellationRequests.length ? (
              <section className="border-t border-[#d8d0c8] pt-4">
                <p className="admin-meta-label">Request history</p>
                <ul className="mt-2 space-y-3">
                  {detail.cancellationRequests.map((request) => (
                    <li key={request.id} className="border-b border-[#e9e1d8] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-[#3a302a]">{request.source.toLowerCase()} request</p>
                        <AdminStatusBadge label={request.status.toLowerCase()} tone={request.status === 'APPROVED' ? 'danger' : request.status === 'REJECTED' ? 'neutral' : 'warning'} />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#605850]">{request.reason}</p>
                      <p className="mt-1 text-[10px] text-[#78706a]">
                        {formatMoney(request.estimatedRefundAmount, request.currency)} estimate · {shortDateTime(request.createdAt)}
                      </p>
                      {request.decisionNote ? <p className="mt-1 text-[10px] text-[#605850]">Decision: {request.decisionNote}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'availability' ? (
          <div className="space-y-5">
            <section>
              <div className="flex items-center justify-between gap-2">
                <p className="admin-meta-label">Overlapping stays</p>
                <span className="text-[10px] font-bold text-[#78706a]">{detail.availability.overlaps.length}</span>
              </div>
              {detail.availability.overlaps.length ? (
                <ul className="mt-2 space-y-2">
                  {detail.availability.overlaps.map((overlap) => (
                    <li key={overlap.id} className="border-b border-[#e9e1d8] pb-2 last:border-0 last:pb-0">
                      <p className="text-xs font-bold text-[#3a302a]">{overlap.reference} · {overlap.guestName}</p>
                      <p className="mt-0.5 text-[10px] text-[#78706a]">{formatStayDate(overlap.checkInDate)} – {formatStayDate(overlap.checkOutDate)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#78706a]">No other active stay overlaps these dates.</p>
              )}
            </section>

            <section className="border-t border-[#d8d0c8] pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="admin-meta-label">Calendar blocks</p>
                {canManage ? (
                  <button type="button" className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b3541e]" onClick={onAddBlock}>
                    Add block
                  </button>
                ) : null}
              </div>
              {detail.availability.blocks.length ? (
                <ul className="mt-2 space-y-2">
                  {detail.availability.blocks.map((block) => (
                    <li key={block.id} className="flex items-start justify-between gap-2 border-b border-[#e9e1d8] pb-2 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#3a302a]">{formatStayDate(block.startDate)} – {formatStayDate(block.endDate)}</p>
                        <p className="mt-0.5 text-[10px] text-[#78706a]">{block.reason || 'No reason'} · {block.source.toLowerCase()}</p>
                      </div>
                      {block.source === 'ADMIN' && canManage ? (
                        <button type="button" className="text-[#9a3f33]" onClick={() => onRemoveBlock(block)} aria-label="Remove admin block">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#78706a]">No calendar blocks for this stay window.</p>
              )}
            </section>

            <div className="flex items-start gap-2 border-t border-[#d8d0c8] pt-4">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#95631f]" />
              <p className="text-[11px] leading-5 text-[#605850]">
                Overlaps are shown for context. Availability changes are audited; reservations themselves are never deleted.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
