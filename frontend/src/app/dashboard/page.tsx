'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, RotateCcw, X, Luggage, Building2 } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Booking, BookingStatus } from '../../types';

interface GuestBooking extends Booking {
  property: {
    id: string;
    title: string;
    city: string;
    coverImage: string | null;
  };
  room?: { id: string; title: string } | null;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `ETB ${amount.toLocaleString()}` : 'Amount unavailable';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewStatusByProperty, setReviewStatusByProperty] = useState<Record<string, boolean | null>>({});
  const [reviewForms, setReviewForms] = useState<Record<string, { rating: number; comment: string }>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [reviewSavingPropertyId, setReviewSavingPropertyId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GuestBooking[]>('/bookings/my-bookings');
      setBookings(data);
      const today = new Date().toISOString().slice(0, 10);
      const reviewablePropertyIds = [...new Set(data
        .filter((booking) => booking.status === 'COMPLETED' && booking.checkOutDate <= today)
        .map((booking) => booking.propertyId))];
      const reviewStatuses = await Promise.all(reviewablePropertyIds.map(async (propertyId) => {
        try {
          const response = await apiFetch<{ hasReviewed: boolean }>(`/properties/${propertyId}/reviews/mine`);
          return [propertyId, response.hasReviewed] as const;
        } catch {
          return [propertyId, null] as const;
        }
      }));
      setReviewStatusByProperty(Object.fromEntries(reviewStatuses));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your reservations.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const cancelBooking = async (booking: GuestBooking) => {
    if (!window.confirm(`Cancel your reservation request for ${booking.property.title}?`)) return;

    setCancellingId(booking.id);
    setActionError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' satisfies BookingStatus }),
      });
      setBookings((current) => current.map((item) =>
        item.id === booking.id ? { ...item, status: 'CANCELLED' } : item,
      ));
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : 'Unable to cancel this reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  const submitReview = async (propertyId: string) => {
    const form = reviewForms[propertyId] || { rating: 5, comment: '' };
    setReviewSavingPropertyId(propertyId);
    setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'success', message: '' } }));
    try {
      await apiFetch(`/properties/${propertyId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: form.rating, comment: form.comment.trim() || undefined }),
      });
      setReviewStatusByProperty((current) => ({ ...current, [propertyId]: true }));
      setReviewForms((current) => ({ ...current, [propertyId]: { rating: 5, comment: '' } }));
      setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'success', message: 'Your review was submitted.' } }));
    } catch (failure) {
      setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'error', message: failure instanceof Error ? failure.message : 'Unable to submit this review.' } }));
    } finally {
      setReviewSavingPropertyId(null);
    }
  };

  const reviewOpportunityByProperty = new Map<string, string>();
  const today = new Date().toISOString().slice(0, 10);
  for (const booking of bookings) {
    if (booking.status === 'COMPLETED' && booking.checkOutDate <= today && !reviewOpportunityByProperty.has(booking.propertyId)) {
      reviewOpportunityByProperty.set(booking.propertyId, booking.id);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <Luggage className="w-3.5 h-3.5 text-slate-600" />
                Guest Traveler Account
              </span>
              {user?.hostProfile && (
                <Link
                  href="/host/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1e40af] text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Switch to Host Portal →</span>
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              My Trips & Stays{user?.name ? ` · ${user.name}` : ''}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Stays and property reservations you&apos;ve requested as a guest. Track host confirmation status and stay details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBookings()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-900">Your reservations could not be loaded</h2>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <button type="button" onClick={() => void loadBookings()} className="mt-4 text-sm font-bold text-red-900 underline">
              Try again
            </button>
          </section>
        )}

        {actionError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}

        {loading && !error && (
          <div role="status" className="space-y-3">
            <p className="text-sm text-slate-500">Loading your reservations…</p>
            {[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <Luggage className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No trips booked yet</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              When you browse accommodations across Ethiopia and request a stay, your booking details and host status will appear here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/?tab=stays" className="inline-flex items-center gap-2 rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a] px-5 py-2.5 text-sm font-bold text-white transition shadow-xs">
                Browse Stays & Rentals
              </Link>
              {user?.hostProfile && (
                <Link href="/host/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition">
                  <Building2 className="w-4 h-4 text-[#1e40af]" />
                  <span>Go to Host Portal</span>
                </Link>
              )}
            </div>
          </section>
        )}

        {!loading && bookings.length > 0 && (
          <ul className="space-y-4">
            {bookings.map((booking) => (
              <li key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{booking.property?.title || 'Listing unavailable'}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status]}`}>
                        {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0" />{booking.property?.city || 'Location unavailable'}
                      {booking.room?.title ? ` · ${booking.room.title}` : ''}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-700">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
                      {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
                      <span className="text-slate-500">· {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{formatAmount(booking.totalPrice)}</span>
                      {booking.paymentMethod && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {booking.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        booking.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {booking.paymentStatus || 'PENDING'}
                      </span>
                      {booking.paymentReference && (
                        <span className="text-[11px] text-slate-400 font-mono">Ref: {booking.paymentReference}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {booking.property?.id && (
                      <Link href={`/properties/${booking.property.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        View listing
                      </Link>
                    )}
                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => void cancelBooking(booking)}
                        disabled={cancellingId === booking.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        {cancellingId === booking.id ? 'Cancelling…' : 'Cancel request'}
                      </button>
                    )}
                  </div>
                  {booking.status === 'COMPLETED' &&
                    booking.checkOutDate <= today &&
                    reviewOpportunityByProperty.get(booking.propertyId) === booking.id &&
                    reviewStatusByProperty[booking.propertyId] !== undefined && (
                      <div className="mt-5 w-full basis-full border-t border-slate-100 pt-4">
                        {reviewStatusByProperty[booking.propertyId] === true ? (
                          <p role="status" className="text-sm font-semibold text-emerald-700">You have reviewed this listing.</p>
                        ) : reviewStatusByProperty[booking.propertyId] === null ? (
                          <p role="alert" className="text-sm text-red-700">Review status could not be checked. Refresh your reservations to try again.</p>
                        ) : (
                          <form onSubmit={(event) => { event.preventDefault(); void submitReview(booking.propertyId); }} className="grid gap-3 sm:grid-cols-[150px_1fr_auto] sm:items-end">
                            <label className="text-xs font-semibold text-slate-600">Your rating
                              <select value={reviewForms[booking.propertyId]?.rating ?? 5} onChange={(event) => setReviewForms((current) => ({ ...current, [booking.propertyId]: { rating: Number(event.target.value), comment: current[booking.propertyId]?.comment ?? '' } }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Comment (optional)
                              <textarea maxLength={2000} rows={2} value={reviewForms[booking.propertyId]?.comment ?? ''} onChange={(event) => setReviewForms((current) => ({ ...current, [booking.propertyId]: { rating: current[booking.propertyId]?.rating ?? 5, comment: event.target.value } }))} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            </label>
                            <button type="submit" disabled={reviewSavingPropertyId === booking.propertyId} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                              {reviewSavingPropertyId === booking.propertyId ? 'Submitting…' : 'Submit review'}
                            </button>
                          </form>
                        )}
                        {reviewFeedback[booking.propertyId]?.message && <p role={reviewFeedback[booking.propertyId].type === 'error' ? 'alert' : 'status'} className={`mt-2 text-sm ${reviewFeedback[booking.propertyId].type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{reviewFeedback[booking.propertyId].message}</p>}
                      </div>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ProtectedRoute>
  );
}
