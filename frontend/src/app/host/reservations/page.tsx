'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import type {
  BookingStatus,
  HostReservationRow,
  HostReservationsResponse,
} from '../../../types/host';

const LIMIT = 20;

const STATUS_OPTIONS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_STYLES: Record<BookingStatus, { background: string; text: string; dot: string }> = {
  PENDING: { background: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  CONFIRMED: { background: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  COMPLETED: { background: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  CANCELLED: { background: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

type Action = 'confirm' | 'complete' | 'cancel';

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `ETB ${amount.toLocaleString()}` : '—';
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLES[status];
  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${style.background} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function ReservationSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#CBD5E1] bg-white p-5">
      <div className="mb-4 flex gap-3">
        <div className="h-14 w-14 rounded-xl bg-[#E3EAF5]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-[#E3EAF5]" />
          <div className="h-3 w-1/2 rounded bg-[#F4F7FC]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#F4F7FC]" />
        <div className="h-3 w-3/4 rounded bg-[#F4F7FC]" />
      </div>
    </div>
  );
}

function ReservationDetails({
  reservation,
  compact = false,
}: {
  reservation: HostReservationRow;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 text-sm ${compact ? 'grid-cols-2' : 'sm:grid-cols-5'}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Guest</p>
        <p className="mt-1 flex items-center gap-1.5 font-semibold text-[#334155]">
          <UserRound className="h-4 w-4 text-[#64748B]" />
          {reservation.guest?.name || 'Guest details unavailable'}
        </p>
        {reservation.guest?.email && (
          <p className="mt-0.5 truncate text-xs text-[#64748B]">{reservation.guest.email}</p>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Stay dates</p>
        <p className="mt-1 font-semibold text-[#334155]">
          {formatDate(reservation.checkInDate)} — {formatDate(reservation.checkOutDate)}
        </p>
      </div>
      {reservation.room && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Room</p>
          <p className="mt-1 font-semibold text-[#334155]">{reservation.room.title} · {reservation.room.roomNumber}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Guests</p>
        <p className="mt-1 font-semibold text-[#334155]">
          {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
        </p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Payment & Total</p>
        <p className="mt-1 font-bold text-[#000000]">{formatAmount(reservation.totalPrice)}</p>
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            {reservation.paymentMethod?.replace(/_/g, ' ') || 'Cash on Arrival'}
          </span>
          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
            reservation.paymentStatus === 'PAID'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {reservation.paymentStatus || 'PENDING'}
          </span>
        </div>
      </div>
    </div>

  );
}

function ReservationActions({
  reservation,
  processing,
  onAction,
}: {
  reservation: HostReservationRow;
  processing: boolean;
  onAction: (action: Action) => void;
}) {
  const actions: { action: Action; label: string; icon: typeof Check; className: string }[] = [];

  if (reservation.status === 'PENDING') {
    actions.push({
      action: 'confirm',
      label: 'Confirm',
      icon: Check,
      className: 'bg-[#33599E] text-white hover:bg-[#234079]',
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  const stayHasEnded = reservation.checkOutDate <= today;

  if (reservation.status === 'CONFIRMED' && stayHasEnded) {
    actions.push({
      action: 'complete',
      label: 'Complete',
      icon: CircleCheck,
      className: 'bg-[#33599E] text-white hover:bg-[#234079]',
    });
  }
  if (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') {
    actions.push({
      action: 'cancel',
      label: 'Cancel',
      icon: X,
      className: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reservation.status === 'CONFIRMED' && !stayHasEnded && (
        <span className="text-xs text-[#64748B]">Completion is available after check-out.</span>
      )}
      {actions.map(({ action, label, icon: Icon, className }) => (
        <button
          key={action}
          type="button"
          disabled={processing}
          onClick={() => onAction(action)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {processing ? 'Updating…' : label}
        </button>
      ))}
    </div>
  );
}

export default function HostReservationsPage() {
  const [reservations, setReservations] = useState<HostReservationRow[]>([]);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (status) params.set('status', status);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    return params.toString();
  }, [fromDate, page, status, toDate]);

  useEffect(() => {
    let active = true;

    const loadReservations = async () => {
      try {
        const response = await apiFetch<HostReservationsResponse>(`/host/reservations?${query}`);
        if (!active) return;
        setReservations(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load reservations.');
      } finally {
        if (active) setLoading(false);
      }
    };

    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setError(null);
      }
    });

    void loadReservations();

    return () => {
      active = false;
    };
  }, [query, refreshVersion]);

  const handleFilterChange = (callback: () => void) => {
    setPage(1);
    setFeedback(null);
    callback();
  };

  const handleAction = async (reservation: HostReservationRow, action: Action) => {
    if (action === 'cancel' && !window.confirm('Cancel this reservation? This action cannot be undone.')) {
      return;
    }

    setProcessingId(reservation.id);
    setFeedback(null);
    try {
      await apiFetch(`/host/reservations/${reservation.id}/${action}`, { method: 'PATCH' });
      const actionLabel = action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'cancelled';
      setFeedback({ type: 'success', message: `Reservation ${actionLabel} successfully.` });
      setRefreshVersion((v) => v + 1);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not update the reservation.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-black text-[#000000]">Reservations</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Review and manage bookings made on your properties.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
          <CalendarDays className="h-4 w-4" />
          {total} {total === 1 ? 'reservation' : 'reservations'}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#CBD5E1] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
            Status
            <select
              value={status}
              onChange={(event) =>
                handleFilterChange(() => setStatus(event.target.value as BookingStatus | ''))
              }
              className="mt-2 block w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-[#334155] outline-none focus:border-[#33599E] focus:ring-2 focus:ring-[#E3EAF5]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
            Check-in from
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => handleFilterChange(() => setFromDate(event.target.value))}
              className="mt-2 block w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-[#334155] outline-none focus:border-[#33599E] focus:ring-2 focus:ring-[#E3EAF5]"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
            Check-out through
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => handleFilterChange(() => setToDate(event.target.value))}
              className="mt-2 block w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-[#334155] outline-none focus:border-[#33599E] focus:ring-2 focus:ring-[#E3EAF5]"
            />
          </label>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
          <CircleX className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-[#000000]">Could not load reservations</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshVersion((v) => v + 1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#33599E] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#234079]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <ReservationSkeleton key={index} />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-2xl border border-[#CBD5E1] bg-white p-10 text-center">
          <CalendarDays className="mx-auto mb-4 h-12 w-12 text-[#94A3B8]" />
          <h2 className="text-lg font-bold text-[#000000]">No reservations found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
            There are no reservations matching the selected filters.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="border-b border-[#CBD5E1] bg-[#F8FAFC]">
                  <tr className="text-xs font-black uppercase tracking-wide text-[#64748B]">
                    <th className="px-5 py-4">Property / guest</th>
                    <th className="px-5 py-4">Dates</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {reservation.property?.coverImage ? (
                            <Image
                              src={reservation.property.coverImage}
                              alt=""
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (

                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E3EAF5]">
                              <CalendarDays className="h-5 w-5 text-[#33599E]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-bold text-[#000000]">
                              {reservation.property?.title || 'Property unavailable'}
                            </p>
                            <p className="mt-0.5 text-xs text-[#64748B]">
                              {reservation.guest?.name || 'Guest details unavailable'}
                              {reservation.property?.city ? ` · ${reservation.property.city}` : ''}
                              {reservation.room ? ` · ${reservation.room.title} (${reservation.room.roomNumber})` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#334155]">
                        <div>{formatDate(reservation.checkInDate)}</div>
                        <div className="text-xs font-medium text-[#64748B]">
                          to {formatDate(reservation.checkOutDate)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-[#000000]">
                        {formatAmount(reservation.totalPrice)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <ReservationActions
                            reservation={reservation}
                            processing={processingId === reservation.id}
                            onAction={(action) => handleAction(reservation, action)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-2xl border border-[#CBD5E1] bg-white p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    {reservation.property?.coverImage ? (
                      <Image
                        src={reservation.property.coverImage}
                        alt=""
                        width={56}
                        height={56}
                        unoptimized
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E3EAF5]">
                        <CalendarDays className="h-5 w-5 text-[#33599E]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-[#000000]">
                        {reservation.property?.title || 'Property unavailable'}
                      </h2>
                      <p className="mt-1 truncate text-xs text-[#64748B]">
                        {reservation.property?.city || 'Location unavailable'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
                <ReservationDetails reservation={reservation} compact />
                <div className="mt-5 border-t border-[#F1F5F9] pt-4">
                  <ReservationActions
                    reservation={reservation}
                    processing={processingId === reservation.id}
                    onAction={(action) => handleAction(reservation, action)}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-[#64748B]">
            Page {page} of {Math.max(totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-bold text-[#334155] hover:bg-[#F4F7FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-bold text-[#334155] hover:bg-[#F4F7FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
