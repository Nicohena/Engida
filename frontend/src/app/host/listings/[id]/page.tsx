'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';

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

function StatusBadge({ status }: { status: ListingStatus }) {
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
          ? 'bg-[#E3EAF5] text-[#33599E]'
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
      : 'bg-[#33599E] hover:bg-[#234079] text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-black text-[#000000]">{title}</h3>
        <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#334155] bg-[#F4F7FC] hover:bg-[#E3EAF5] border border-[#CBD5E1] transition disabled:opacity-50"
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
  // Status Mutations
  // ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!listing) return;
    setActionLoading(true);
    try {
      await apiFetch(`/host/listings/${listing.id}/publish`, { method: 'PATCH' });
      showToast('Listing published successfully! It is now visible to guests.', 'success');
      await fetchListing();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to publish listing.', 'error');
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
        <div className="h-6 w-36 bg-[#E3EAF5] rounded-lg" />
        <div className="h-10 w-3/4 bg-[#E3EAF5] rounded-xl" />
        <div className="h-72 w-full bg-[#E3EAF5] rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#E3EAF5] rounded-xl" />
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
        <div className="w-16 h-16 rounded-2xl bg-[#F4F7FC] border border-[#CBD5E1] flex items-center justify-center mx-auto text-[#94A3B8]">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#000000]">Listing Not Found</h1>
        <p className="text-sm text-[#64748B] leading-relaxed">
          The listing with ID <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{listingId}</code> does
          not exist or you do not have permission to view it.
        </p>
        <div>
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition"
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
        <h1 className="text-2xl font-black text-[#000000]">Failed to load listing</h1>
        <p className="text-sm text-[#64748B]">{error || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/host/listings"
            className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm font-bold text-[#334155] hover:bg-[#F4F7FC] transition"
          >
            Back to Listings
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              fetchListing();
            }}
            className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#33599E] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Listings
        </Link>

        {isPublished && (
          <Link
            href={`/properties/${listing.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#33599E] hover:underline"
          >
            <span>View Public Listing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={listing.status} />
            <TypeBadge type={listing.listingType} />
            <span className="text-xs text-[#94A3B8] font-mono">ID: {listing.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#000000] tracking-tight">
            {listing.title}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <MapPin className="w-3.5 h-3.5 text-[#33599E]" />
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F4F7FC] hover:border-[#33599E] transition"
            >
              <Pencil className="w-4 h-4 text-[#33599E]" /> Edit Listing
            </Link>
          )}
        </div>
      </div>

      {/* ── Status Workflow Action Bar ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-[#000000] flex items-center gap-2">
              <span>Listing Lifecycle:</span>
              <span className="text-[#33599E]">
                {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
              </span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isDraft &&
                'This listing is currently in Draft status. Complete details and publish when ready to receive inquiries.'}
              {isPublished && 'This listing is live, visible in search, and ready for bookings/buyers.'}
              {isPaused && 'This listing is temporarily paused and hidden from search.'}
              {isSold && 'This property has been marked as sold. The transaction is complete.'}
              {isArchived && 'This listing is archived and cannot be published or edited.'}
            </p>
          </div>

          {/* Workflow Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* DRAFT -> PUBLISH */}
            {isDraft && (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {actionLoading ? 'Publishing…' : 'Publish Listing'}
              </button>
            )}

            {/* PUBLISHED -> PAUSE */}
            {isPublished && (
              <button
                onClick={() => setShowPauseModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </button>
            )}

            {/* PAUSED -> RESUME / PUBLISH */}
            {isPaused && (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Listing
              </button>
            )}

            {/* SALE LISTINGS -> MARK SOLD */}
            {isSale && (isPublished || isPaused) && (
              <button
                onClick={() => setShowSoldModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <BadgeCheck className="w-3.5 h-3.5" /> Mark Sold
              </button>
            )}

            {/* PUBLISHED / PAUSED -> ARCHIVE */}
            {(isPublished || isPaused) && (
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
          />

          {/* Description Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-3 shadow-sm">
            <h2 className="text-base font-black text-[#000000]">About This Property</h2>
            <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* Features & Amenities Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#33599E]" />
                <h2 className="text-base font-black text-[#000000]">Features &amp; Amenities</h2>
                {listing.amenities && listing.amenities.length > 0 && (
                  <span className="text-xs font-semibold text-[#64748B] bg-[#F4F7FC] px-2.5 py-0.5 rounded-full border border-[#CBD5E1]">
                    {listing.amenities.length}
                  </span>
                )}
              </div>
              {!isArchived && !isSold && (
                <Link
                  href={`/host/listings/${listing.id}/edit`}
                  className="text-xs font-bold text-[#33599E] hover:underline flex items-center gap-1"
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
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1]/70 text-xs font-bold text-[#334155]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#E3EAF5] text-[#33599E] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1]/60 text-xs text-[#64748B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>No amenities specified for this listing yet. Adding amenities helps guests find and choose your property.</span>
                {!isArchived && !isSold && (
                  <Link
                    href={`/host/listings/${listing.id}/edit`}
                    className="font-bold text-[#33599E] hover:underline shrink-0"
                  >
                    Add Amenities
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Location & Administrative Hierarchy */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <MapPin className="w-4 h-4 text-[#33599E]" />
              <h2 className="text-base font-black text-[#000000]">Location Details</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                  Address
                </span>
                <span className="font-semibold text-[#000000] mt-0.5 block">{listing.address}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">City</span>
                <span className="font-semibold text-[#000000] mt-0.5 block">{listing.city}</span>
              </div>
              {listing.subCity && (
                <div>
                  <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                    Sub-City
                  </span>
                  <span className="font-semibold text-[#000000] mt-0.5 block">{listing.subCity}</span>
                </div>
              )}
              {listing.woreda && (
                <div>
                  <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                    Woreda
                  </span>
                  <span className="font-semibold text-[#000000] mt-0.5 block">{listing.woreda}</span>
                </div>
              )}
              {listing.neighborhood && (
                <div>
                  <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                    Neighborhood
                  </span>
                  <span className="font-semibold text-[#000000] mt-0.5 block">
                    {listing.neighborhood}
                  </span>
                </div>
              )}
              {listing.region && (
                <div>
                  <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                    Region
                  </span>
                  <span className="font-semibold text-[#000000] mt-0.5 block">{listing.region}</span>
                </div>
              )}
              {listing.zone && (
                <div>
                  <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                    Zone
                  </span>
                  <span className="font-semibold text-[#000000] mt-0.5 block">{listing.zone}</span>
                </div>
              )}
              <div>
                <span className="text-[#94A3B8] font-bold uppercase tracking-wider block">
                  Country
                </span>
                <span className="font-semibold text-[#000000] mt-0.5 block">
                  {listing.country || 'Ethiopia'}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            {(listing.latitude !== null || listing.longitude !== null) && (
              <div className="pt-3 border-t border-[#F1F5F9] flex items-center gap-4 text-xs text-[#64748B]">
                <Compass className="w-4 h-4 text-[#33599E]" />
                <span>
                  Coordinates:{' '}
                  <strong className="text-[#000000] font-mono">
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
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#94A3B8]">
                {listing.listingType === 'RENTAL' ? 'Nightly Rate' : 'Total Valuation'}
              </span>
              <div className="text-2xl font-black text-[#000000] mt-1">{formattedPrice}</div>
            </div>

            {/* Key Specs Grid */}
            <div className="space-y-3 pt-3 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#33599E]" /> Property Type
                </span>
                <span className="font-bold text-[#000000]">{listing.propertyType}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#33599E]" /> Max Guests
                </span>
                <span className="font-bold text-[#000000]">{listing.maxGuests || 1}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Bed className="w-4 h-4 text-[#33599E]" /> Bedrooms
                </span>
                <span className="font-bold text-[#000000]">{listing.bedrooms || 0}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Bath className="w-4 h-4 text-[#33599E]" /> Bathrooms
                </span>
                <span className="font-bold text-[#000000]">{listing.bathrooms || 0}</span>
              </div>

              {listing.areaSqm ? (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#33599E]" /> Area
                  </span>
                  <span className="font-bold text-[#000000]">{listing.areaSqm} m²</span>
                </div>
              ) : null}

              {listing.parkingSpaces ? (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#33599E]" /> Parking Spaces
                  </span>
                  <span className="font-bold text-[#000000]">{listing.parkingSpaces}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Listing Metadata */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 space-y-3 text-xs text-[#64748B]">
            <h3 className="font-black text-[#000000] text-sm">Listing Metadata</h3>
            <div className="flex items-center justify-between py-1">
              <span>Created</span>
              <span className="font-semibold text-[#000000]">
                {new Date(listing.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Last Updated</span>
              <span className="font-semibold text-[#000000]">
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
                  listing.isAvailable ? 'text-emerald-700' : 'text-slate-500'
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
