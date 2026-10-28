'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '../../../../lib/api';
import type {
  HostListingDetail,
  ListingStatus,
  ListingType,
} from '../../../../types/host';
import HostListingGallery from '../../../../components/host/HostListingGallery';
import { getAmenityIcon } from '../../../../components/host/AmenitySelector';
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Pencil,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Play,
  Pause,
  Archive,
  BadgeCheck,
  Users,
  Bed,
  Bath,
  Maximize2,
  Car,
  Compass,
  ExternalLink,
  Sparkles,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────
// Status Badge Styles
// ─────────────────────────────────────────────────────────
const STATUS_STYLES: Record<ListingStatus, { bg: string; text: string; dot: string; label: string }> = {
  DRAFT: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Draft',
  },
  PUBLISHED: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Published',
  },
  PAUSED: {
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    label: 'Paused',
  },
  ARCHIVED: {
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    label: 'Archived',
  },
  SOLD: {
    bg: 'bg-violet-50 border-violet-200',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    label: 'Sold',
  },
};

function StatusBadge({
  status,
  adminHidden,
  activeReview,
}: {
  status: ListingStatus;
  adminHidden?: boolean;
  activeReview?: import('../../../../types/host').ListingReviewItem | null;
}) {
  if (adminHidden) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-rose-50 border-rose-200 text-rose-700">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-rose-500 animate-pulse" />
        Temporarily Hidden by Admin
      </span>
    );
  }
  if (activeReview?.status === 'PENDING') {
    if (activeReview.submissionType === 'INITIAL_PUBLISH' || status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-amber-50 border-amber-200 text-amber-700">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-500 animate-pulse" />
          Pending Initial Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-[#f2ece4] border-[#d8d0c8] text-[#c2652a]">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#c2652a] animate-pulse" />
        Changes Awaiting Review
      </span>
    );
  }
  if (activeReview?.status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-rose-50 border-rose-200 text-rose-700">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-rose-500" />
        Changes Rejected — Correction Required
      </span>
    );
  }
  if (activeReview?.status === 'WITHDRAWN' && status === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-stone-50 border-[#d8d0c8] text-[#605850]">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#605850]" />
        Review Withdrawn
      </span>
    );
  }
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${s.bg} ${s.text}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: ListingType }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
        type === 'RENTAL'
          ? 'bg-[#f2ece4] text-[#c2652a]'
          : 'bg-violet-100 text-violet-800'
      }`}
    >
      {type === 'RENTAL' ? 'Rental' : 'Sale'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Confirmation Modals
// ─────────────────────────────────────────────────────────
interface ActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmStyle?: 'danger' | 'warning' | 'primary';
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ActionModal({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmStyle = 'primary',
  isLoading,
  onConfirm,
  onCancel,
}: ActionModalProps) {
  if (!isOpen) return null;

  const btnColors =
    confirmStyle === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : confirmStyle === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#d8d0c8] max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-black text-[#3a302a]">{title}</h3>
        <p className="text-sm text-[#605850] leading-relaxed">{description}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#3a302a] bg-[#faf5ee] hover:bg-[#f2ece4] border border-[#d8d0c8] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2 ${btnColors}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Listing Detail Page Component
// ─────────────────────────────────────────────────────────
export default function ListingDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const [listing, setListing] = useState<HostListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // Status Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    try {
      setLoading(true);
      const data = await apiFetch<HostListingDetail>(`/host/listings/${listingId}`);
      setListing(data);
      setError(null);
      setIs404(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load listing.';
      if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
        setIs404(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!listingId) return;
    let ignore = false;
    apiFetch<HostListingDetail>(`/host/listings/${listingId}`)
      .then((data) => {
        if (!ignore) {
          setListing(data);
          setError(null);
          setIs404(false);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load listing.';
          if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
            setIs404(true);
          } else {
            setError(msg);
          }
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [listingId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ─────────────────────────────────────────────────────────
  // Status Mutations & Review Actions
  // ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      const res = await apiFetch<{ message?: string }>(`/host/listings/${listing.id}/publish`, { method: 'PATCH' });
      showToast(
        res?.message || 'Listing submitted for review successfully! An administrator will review it shortly.',
        'success',
      );
      await fetchListing();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to submit listing for review.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawReview = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      await apiFetch(`/host/listings/${listing.id}/withdraw-review`, { method: 'POST' });
      showToast('Review proposal withdrawn. Your live listing remains unchanged.', 'success');
      await fetchListing();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to withdraw review proposal.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      await apiFetch(`/host/listings/${listing.id}/pause`, { method: 'PATCH' });
      setShowPauseModal(false);
      showToast('Listing paused. It is temporarily hidden from search results.', 'success');
      await fetchListing();
    } catch (err: unknown) {
      setShowPauseModal(false);
      showToast(err instanceof Error ? err.message : 'Failed to pause listing.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      await apiFetch(`/host/listings/${listing.id}/archive`, { method: 'PATCH' });
      setShowArchiveModal(false);
      showToast('Listing archived successfully.', 'success');
      await fetchListing();
    } catch (err: unknown) {
      setShowArchiveModal(false);
      showToast(err instanceof Error ? err.message : 'Failed to archive listing.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSold = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      await apiFetch(`/host/listings/${listing.id}/mark-sold`, { method: 'PATCH' });
      setShowSoldModal(false);
      showToast('Listing marked as SOLD successfully.', 'success');
      await fetchListing();
    } catch (err: unknown) {
      setShowSoldModal(false);
      showToast(err instanceof Error ? err.message : 'Failed to mark listing as sold.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-[#f2ece4] rounded-lg" />
        <div className="h-10 w-3/4 bg-[#f2ece4] rounded-xl" />
        <div className="h-72 w-full bg-[#f2ece4] rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#f2ece4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // 404 Not Found State
  // ─────────────────────────────────────────────────────────
  if (is404) {
    return (
      <div className="p-6 md:p-12 max-w-xl mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#faf5ee] border border-[#d8d0c8] flex items-center justify-center mx-auto text-[#605850]">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#3a302a]">Listing Not Found</h1>
        <p className="text-sm text-[#605850] leading-relaxed">
          The listing with ID <code className="font-mono text-xs bg-[#f2ece4] px-1.5 py-0.5 rounded text-[#3a302a]">{listingId}</code> does
          not exist or you do not have permission to view it.
        </p>
        <div>
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-2 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // General Error State
  // ─────────────────────────────────────────────────────────
  if (error || !listing) {
    return (
      <div className="p-6 md:p-12 max-w-xl mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#3a302a]">Failed to load listing</h1>
        <p className="text-sm text-[#605850]">{error || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/host/listings"
            className="px-5 py-2.5 rounded-xl border border-[#d8d0c8] text-sm font-bold text-[#3a302a] hover:bg-[#faf5ee] transition"
          >
            Back to Listings
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              fetchListing();
            }}
            className="inline-flex items-center gap-2 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Format Price
  const formattedPrice =
    listing.listingType === 'RENTAL'
      ? `ETB ${Number(listing.pricePerNight || 0).toLocaleString()} / night`
      : `ETB ${Number(listing.salePrice || 0).toLocaleString()}`;

  const isSale = listing.listingType === 'SALE';
  const isDraft = listing.status === 'DRAFT';
  const isPublished = listing.status === 'PUBLISHED';
  const isPaused = listing.status === 'PAUSED';
  const isSold = listing.status === 'SOLD';
  const isArchived = listing.status === 'ARCHIVED';

  const verificationStatus = user?.hostProfile?.verificationStatus;
  const isHostVerified = verificationStatus === 'VERIFIED';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold border transition-all ${
            toast.type === 'success'
              ? 'bg-white border-emerald-300 text-emerald-800'
              : 'bg-white border-red-300 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <ActionModal
        isOpen={showArchiveModal}
        title="Archive Listing"
        description={`Are you sure you want to archive "${listing.title}"? Archiving permanently removes this listing from search results and guest discovery. This cannot be undone.`}
        confirmLabel="Yes, Archive Listing"
        confirmStyle="warning"
        isLoading={actionLoading}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveModal(false)}
      />

      <ActionModal
        isOpen={showPauseModal}
        title="Pause Listing"
        description={`Pausing "${listing.title}" will temporarily hide it from search and prevent new reservations. You can resume and publish it again at any time.`}
        confirmLabel="Yes, Pause Listing"
        confirmStyle="primary"
        isLoading={actionLoading}
        onConfirm={handlePause}
        onCancel={() => setShowPauseModal(false)}
      />

      <ActionModal
        isOpen={showSoldModal}
        title="Mark Property as Sold"
        description={`Are you sure you want to mark "${listing.title}" as SOLD? This indicates that the sale has been finalized. The listing will remain in your records as sold.`}
        confirmLabel="Yes, Mark as Sold"
        confirmStyle="primary"
        isLoading={actionLoading}
        onConfirm={handleMarkSold}
        onCancel={() => setShowSoldModal(false)}
      />

      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/host/listings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#605850] hover:text-[#c2652a] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Listings
        </Link>

        {isPublished && (
          <Link
            href={`/properties/${listing.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#c2652a] hover:underline"
          >
            <span>View Public Listing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#d8d0c8]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge
              status={listing.status}
              adminHidden={listing.adminHidden}
              activeReview={listing.activeReview}
            />
            <TypeBadge type={listing.listingType} />
            <span className="text-xs text-[#605850] font-mono">ID: {listing.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#3a302a] tracking-tight">
            {listing.title}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#605850]">
            <MapPin className="w-3.5 h-3.5 text-[#c2652a]" />
            <span>
              {listing.address}, {listing.city}
              {listing.subCity ? `, ${listing.subCity}` : ''}, {listing.country || 'Ethiopia'}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {!isArchived && !isSold && (
            <Link
              href={`/host/listings/${listing.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#3a302a] bg-white border border-[#d8d0c8] hover:bg-[#faf5ee] hover:border-[#c2652a] transition shadow-xs"
            >
              <Pencil className="w-4 h-4 text-[#c2652a]" /> Edit Listing
            </Link>
          )}
        </div>
      </div>

      {/* ── Moderation Alerts ── */}
      {listing.adminHidden && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">Temporarily Hidden by Administrator</h3>
            <p className="text-xs text-rose-800 mt-1">
              <strong>Reason:</strong> {listing.adminHiddenReason || 'Administrative review required.'}
            </p>
            <p className="text-xs text-rose-700 mt-1">
              This listing is hidden from search and is not accepting bookings. Please review the explanation above, edit your listing to correct the identified concerns, and contact support to restore visibility.
            </p>
          </div>
        </div>
      )}

      {listing.activeReview?.status === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {listing.activeReview.submissionType === 'INITIAL_PUBLISH'
                    ? 'Pending Initial Admin Review'
                    : 'Important Changes Awaiting Admin Review'}
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  {listing.activeReview.submissionType === 'INITIAL_PUBLISH'
                    ? 'Your listing was submitted for review. It will become publicly visible once an administrator reviews and approves it.'
                    : 'Your proposed modifications are being reviewed. Your live approved listing remains online and unchanged.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleWithdrawReview}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100 transition disabled:opacity-50 flex-shrink-0"
            >
              Withdraw Proposal
            </button>
          </div>

          {listing.activeReview.proposedChanges && Object.keys(listing.activeReview.proposedChanges).length > 0 && (
            <div className="pt-2 border-t border-amber-200/60">
              <p className="text-xs font-bold text-amber-900 mb-2">Proposed Modifications Under Review:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-900">
                {Object.entries(listing.activeReview.proposedChanges).map(([k, v]) => {
                  if (k === 'coverImage' && typeof v === 'string') {
                    return (
                      <div
                        key={k}
                        className="bg-white/90 rounded-xl p-3 border border-amber-200 shadow-2xs col-span-1 sm:col-span-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-amber-950 block">Proposed Cover Photo</span>
                          <span className="text-[#605850] text-[11px] truncate block max-w-sm">{v}</span>
                        </div>
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#d8d0c8] shrink-0 bg-[#faf5ee]">
                          <Image src={v} alt="Proposed cover preview" fill sizes="56px" className="object-cover" />
                        </div>
                      </div>
                    );
                  }
                  if (k === 'images' && Array.isArray(v)) {
                    return (
                      <div
                        key={k}
                        className="bg-white/90 rounded-xl p-3 border border-amber-200 shadow-2xs col-span-1 sm:col-span-2 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950">Proposed Photo Gallery</span>
                          <span className="text-[#605850] font-semibold text-[11px]">{v.length} photos</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {v.slice(0, 6).map((imgUrl, i) => (
                            <div
                              key={i}
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#d8d0c8] shrink-0 bg-[#faf5ee]"
                            >
                              <Image src={imgUrl} alt={`Proposed ${i + 1}`} fill sizes="48px" className="object-cover" />
                            </div>
                          ))}
                          {v.length > 6 && (
                            <span className="text-[11px] font-bold text-[#605850] px-2">
                              +{v.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (k === 'amenityIds' && Array.isArray(v)) {
                    return (
                      <div key={k} className="bg-white/90 rounded-lg p-2.5 border border-amber-200 shadow-2xs">
                        <span className="font-bold capitalize text-amber-950">Proposed Amenities: </span>
                        <span className="text-[#3a302a]">{v.length} selected</span>
                      </div>
                    );
                  }
                  return (
                    <div key={k} className="bg-white/90 rounded-lg p-2.5 border border-amber-200 shadow-2xs">
                      <span className="font-bold capitalize text-amber-950">{k}: </span>
                      <span className="text-[#3a302a]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {listing.activeReview?.status === 'REJECTED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Review Rejected — Correction Required</h3>
              <p className="text-xs text-rose-800 mt-1">
                <strong>Admin Feedback:</strong> {listing.activeReview.rejectionReason}
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Please edit your listing to resolve the issues above, then resubmit for review.
              </p>
            </div>
          </div>
          <Link
            href={`/host/listings/${listing.id}/edit`}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex-shrink-0"
          >
            Edit &amp; Resubmit
          </Link>
        </div>
      )}

      {/* ── Status Workflow Action Bar ── */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-sm space-y-3">
        {!isHostVerified && (isDraft || isPaused) && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs mb-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-900">
                  Host identity verification required for public listing publication
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  You can freely draft, edit, and organize your listing. However, public publication to guests requires administrative identity verification (your current status is{' '}
                  <span className="font-bold uppercase">{verificationStatus || 'UNVERIFIED'}</span>).
                </p>
              </div>
            </div>
            <Link
              href="/host/profile"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 transition shrink-0 self-start sm:self-auto"
            >
              <span>Verify Host Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-[#3a302a] flex items-center gap-2">
              <span>Listing Lifecycle:</span>
              <span className="text-[#c2652a]">
                {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
              </span>
            </h2>
            <p className="text-xs text-[#605850] mt-0.5">
              {listing.adminHidden
                ? 'This listing is temporarily hidden by an administrator. Please resolve the hold reasons above.'
                : isDraft
                ? listing.activeReview?.status === 'PENDING'
                  ? 'Your draft listing is in the admin review queue. You will be notified once reviewed.'
                  : 'This listing is in Draft status. Submit for admin review when ready to publish.'
                : isPublished
                ? 'This listing is live, visible in search, and ready for bookings/buyers.'
                : isPaused
                ? 'This listing is temporarily paused and hidden from search.'
                : isSold
                ? 'This property has been marked as sold. The transaction is complete.'
                : 'This listing is archived and cannot be published or edited.'}
            </p>
          </div>

          {/* Workflow Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* DRAFT -> SUBMIT FOR REVIEW */}
            {isDraft && !listing.adminHidden && (
              listing.activeReview?.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 animate-spin" /> In Review Queue
                  </span>
                  <button
                    onClick={handleWithdrawReview}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Withdraw
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {actionLoading ? 'Submitting…' : 'Submit for Review'}
                </button>
              )
            )}

            {/* PUBLISHED -> PAUSE */}
            {isPublished && !listing.adminHidden && (
              <button
                onClick={() => setShowPauseModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </button>
            )}

            {/* PAUSED -> RESUME / PUBLISH */}
            {isPaused && !listing.adminHidden && (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Listing
              </button>
            )}

            {/* SALE LISTINGS -> MARK SOLD */}
            {isSale && (isPublished || isPaused) && !listing.adminHidden && (
              <button
                onClick={() => setShowSoldModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <BadgeCheck className="w-3.5 h-3.5" /> Mark Sold
              </button>
            )}

            {/* PUBLISHED / PAUSED -> ARCHIVE */}
            {(isPublished || isPaused) && !listing.adminHidden && (
              <button
                onClick={() => setShowArchiveModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 border border-amber-300 hover:bg-amber-50 px-3.5 py-2 rounded-xl transition disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout (2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Gallery Section */}
          <HostListingGallery
            listingId={listing.id}
            title={listing.title}
            coverImage={listing.coverImage}
            images={listing.images || []}
            proposedCoverImage={
              listing.activeReview?.status === 'PENDING' &&
              typeof listing.activeReview.proposedChanges?.coverImage === 'string'
                ? listing.activeReview.proposedChanges.coverImage
                : undefined
            }
            proposedImages={
              listing.activeReview?.status === 'PENDING' &&
              Array.isArray(listing.activeReview.proposedChanges?.images)
                ? (listing.activeReview.proposedChanges.images as string[])
                : undefined
            }
            isPendingReview={listing.activeReview?.status === 'PENDING'}
          />

          {/* Description Card */}
          <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 space-y-3 shadow-sm">
            <h2 className="text-base font-black text-[#3a302a]">About This Property</h2>
            <p className="text-sm text-[#3a302a] leading-relaxed whitespace-pre-line">
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* Features & Amenities Card */}
          <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#d8d0c8] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c2652a]" />
                <h2 className="text-base font-black text-[#3a302a]">Features &amp; Amenities</h2>
                {listing.amenities && listing.amenities.length > 0 && (
                  <span className="text-xs font-semibold text-[#605850] bg-[#faf5ee] px-2.5 py-0.5 rounded-full border border-[#d8d0c8]">
                    {listing.amenities.length}
                  </span>
                )}
                {listing.activeReview?.status === 'PENDING' &&
                  Array.isArray(listing.activeReview.proposedChanges?.amenityIds) && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Proposed: {listing.activeReview.proposedChanges.amenityIds.length}
                    </span>
                  )}
              </div>
              {!isArchived && !isSold && (
                <Link
                  href={`/host/listings/${listing.id}/edit`}
                  className="text-xs font-bold text-[#c2652a] hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Link>
              )}
            </div>

            {listing.amenities && listing.amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.amenities.map((amenity) => {
                  const Icon = getAmenityIcon(amenity.name, amenity.icon);
                  return (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#faf5ee] border border-[#d8d0c8] text-xs font-bold text-[#3a302a]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#f2ece4] text-[#c2652a] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#faf5ee] border border-[#d8d0c8] text-xs text-[#605850] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>No amenities specified for this listing yet. Adding amenities helps guests find and choose your property.</span>
                {!isArchived && !isSold && (
                  <Link
                    href={`/host/listings/${listing.id}/edit`}
                    className="font-bold text-[#c2652a] hover:underline shrink-0"
                  >
                    Add Amenities
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Location & Administrative Hierarchy */}
          <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#d8d0c8] pb-3">
              <MapPin className="w-4 h-4 text-[#c2652a]" />
              <h2 className="text-base font-black text-[#3a302a]">Location Details</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#605850] font-bold uppercase tracking-wider block">
                  Address
                </span>
                <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.address}</span>
              </div>
              <div>
                <span className="text-[#605850] font-bold uppercase tracking-wider block">City</span>
                <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.city}</span>
              </div>
              {listing.subCity && (
                <div>
                  <span className="text-[#605850] font-bold uppercase tracking-wider block">
                    Sub-City
                  </span>
                  <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.subCity}</span>
                </div>
              )}
              {listing.woreda && (
                <div>
                  <span className="text-[#605850] font-bold uppercase tracking-wider block">
                    Woreda
                  </span>
                  <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.woreda}</span>
                </div>
              )}
              {listing.neighborhood && (
                <div>
                  <span className="text-[#605850] font-bold uppercase tracking-wider block">
                    Neighborhood
                  </span>
                  <span className="font-semibold text-[#3a302a] mt-0.5 block">
                    {listing.neighborhood}
                  </span>
                </div>
              )}
              {listing.region && (
                <div>
                  <span className="text-[#605850] font-bold uppercase tracking-wider block">
                    Region
                  </span>
                  <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.region}</span>
                </div>
              )}
              {listing.zone && (
                <div>
                  <span className="text-[#605850] font-bold uppercase tracking-wider block">
                    Zone
                  </span>
                  <span className="font-semibold text-[#3a302a] mt-0.5 block">{listing.zone}</span>
                </div>
              )}
              <div>
                <span className="text-[#605850] font-bold uppercase tracking-wider block">
                  Country
                </span>
                <span className="font-semibold text-[#3a302a] mt-0.5 block">
                  {listing.country || 'Ethiopia'}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            {(listing.latitude !== null || listing.longitude !== null) && (
              <div className="pt-3 border-t border-[#d8d0c8] flex items-center gap-4 text-xs text-[#605850]">
                <Compass className="w-4 h-4 text-[#c2652a]" />
                <span>
                  Coordinates:{' '}
                  <strong className="text-[#3a302a] font-mono">
                    {listing.latitude ?? '—'}, {listing.longitude ?? '—'}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column / Sidebar */}
        <div className="space-y-6">
          {/* Price & Primary Specs Card */}
          <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#605850]">
                {listing.listingType === 'RENTAL' ? 'Price per night' : 'Total Valuation'}
              </span>
              <div className="text-2xl font-black text-[#3a302a] mt-1">{formattedPrice}</div>
            </div>

            {/* Key Specs Grid */}
            <div className="space-y-3 pt-3 border-t border-[#d8d0c8]">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#605850] flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#c2652a]" /> Property Type
                </span>
                <span className="font-bold text-[#3a302a]">{listing.propertyType}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#605850] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#c2652a]" /> Max Guests
                </span>
                <span className="font-bold text-[#3a302a]">{listing.maxGuests || 1}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#605850] flex items-center gap-2">
                  <Bed className="w-4 h-4 text-[#c2652a]" /> Bedrooms
                </span>
                <span className="font-bold text-[#3a302a]">{listing.bedrooms || 0}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#605850] flex items-center gap-2">
                  <Bath className="w-4 h-4 text-[#c2652a]" /> Bathrooms
                </span>
                <span className="font-bold text-[#3a302a]">{listing.bathrooms || 0}</span>
              </div>

              {listing.areaSqm ? (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#605850] flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#c2652a]" /> Area
                  </span>
                  <span className="font-bold text-[#3a302a]">{listing.areaSqm} m²</span>
                </div>
              ) : null}

              {listing.parkingSpaces ? (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#605850] flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#c2652a]" /> Parking Spaces
                  </span>
                  <span className="font-bold text-[#3a302a]">{listing.parkingSpaces}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Listing Metadata */}
          <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 space-y-3 text-xs text-[#605850] shadow-sm">
            <h3 className="font-black text-[#3a302a] text-sm">Listing Metadata</h3>
            <div className="flex items-center justify-between py-1">
              <span>Created</span>
              <span className="font-semibold text-[#3a302a]">
                {new Date(listing.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Last Updated</span>
              <span className="font-semibold text-[#3a302a]">
                {new Date(listing.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Availability</span>
              <span
                className={`font-bold ${
                  listing.isAvailable ? 'text-emerald-700' : 'text-[#605850]'
                }`}
              >
                {listing.isAvailable ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
