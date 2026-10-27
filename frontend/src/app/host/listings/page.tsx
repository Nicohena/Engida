'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '../../../lib/api';
import type {
  HostListingRow,
  HostListingsResponse,
  HostListingsQuery,
  ListingStatus,
  ListingType,
} from '../../../types/host';
import {
  Plus,
  Search,
  X,
  RotateCcw,
  Archive,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Building2,
  Filter,
  AlertTriangle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────
const LIMIT = 15;

const LISTING_TYPE_OPTIONS: { label: string; value: ListingType | '' }[] = [
  { label: 'All Types', value: '' },
  { label: 'Rental', value: 'RENTAL' },
  { label: 'Sale', value: 'SALE' },
];

const STATUS_OPTIONS: { label: string; value: ListingStatus | '' }[] = [
  { label: 'All Status', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Sold', value: 'SOLD' },
];

// ─────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<ListingStatus, { bg: string; text: string; dot: string }> = {
  DRAFT:     { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  PUBLISHED: { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  PAUSED:    { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  ARCHIVED:  { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  SOLD:      { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500' },
};

function StatusBadge({
  status,
  adminHidden,
  hasPendingReview,
  pendingReviewType,
  rejectionReason,
}: {
  status: ListingStatus;
  adminHidden?: boolean;
  hasPendingReview?: boolean;
  pendingReviewType?: 'INITIAL_PUBLISH' | 'IMPORTANT_EDIT' | null;
  rejectionReason?: string | null;
}) {
  if (adminHidden) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
        Admin Hidden
      </span>
    );
  }

  if (hasPendingReview) {
    if (pendingReviewType === 'INITIAL_PUBLISH' || status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          Pending Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
        Changes Pending
      </span>
    );
  }

  if (rejectionReason) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200"
        title={rejectionReason}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
        Needs Correction
      </span>
    );
  }

  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles.bg} ${styles.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────
// Listing type badge
// ─────────────────────────────────────────────────────
function TypeBadge({ type }: { type: ListingType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${
        type === 'RENTAL'
          ? 'bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5]'
          : 'bg-[#F8F5ED] text-[#252923] border border-[#E5E0D5]'
      }`}
    >
      {type === 'RENTAL' ? 'Rental' : 'Sale'}
    </span>
  );
}

// ─────────────────────────────────────────────────────
// Price formatter (ETB)
// ─────────────────────────────────────────────────────
function formatPrice(listing: HostListingRow): string {
  if (listing.listingType === 'RENTAL') {
    const price = Number(listing.pricePerNight);
    if (!price) return '—';
    return `ETB ${price.toLocaleString()}/night`;
  } else {
    const price = Number(listing.salePrice);
    if (!price) return '—';
    if (price >= 1_000_000) return `ETB ${(price / 1_000_000).toFixed(1)}M`;
    if (price >= 1_000) return `ETB ${(price / 1_000).toFixed(0)}K`;
    return `ETB ${price.toLocaleString()}`;
  }
}

// ─────────────────────────────────────────────────────
// Cover image cell
// ─────────────────────────────────────────────────────
function CoverThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="w-14 h-14 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-[#73776F]" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-[#E5E0D5] relative">
      <Image src={src} alt={alt} fill unoptimized className="object-cover" sizes="56px" />
    </div>

  );
}

// ─────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-[#EEF3EF]">
      {[120, 80, 100, 80, 80, 80, 60].map((w, i) => (
        <td key={i} className="py-3.5 px-4">
          <div className="h-4 bg-[#EEF3EF] rounded animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E0D5] rounded-2xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-[#EEF3EF] flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-[#EEF3EF] rounded w-3/4" />
          <div className="h-3 bg-[#F8F5ED] rounded w-1/2" />
          <div className="h-3 bg-[#F8F5ED] rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Archive confirmation modal
// ─────────────────────────────────────────────────────
interface ArchiveModalProps {
  listing: HostListingRow;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ArchiveModal({ listing, onConfirm, onCancel, isLoading }: ArchiveModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E0D5] max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Archive className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#252923] mb-1">Archive Listing</h3>
            <p className="text-sm text-[#73776F] leading-relaxed">
              Are you sure you want to archive{' '}
              <span className="font-bold text-[#252923]">&ldquo;{listing.title}&rdquo;</span>?
              <br />
              Archiving removes this listing from active search results and guest discovery.
              It cannot be unarchived.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#252923] bg-[#F8F5ED] hover:bg-[#EEF3EF] border border-[#E5E0D5] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {isLoading ? 'Archiving…' : 'Yes, Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Pagination bar
// ─────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, total, limit, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#EEF3EF]">
      <p className="text-xs text-[#73776F] font-medium">
        {from}–{to} of {total} listings
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#252923] border border-[#E5E0D5] hover:bg-[#F8F5ED] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-xs font-bold text-[#252923] px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#252923] border border-[#E5E0D5] hover:bg-[#F8F5ED] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Check if any filter is active
// ─────────────────────────────────────────────────────
function hasActiveFilters(q: HostListingsQuery): boolean {
  return !!(q.listingType || q.status || q.city?.trim() || q.subCity?.trim() || q.search?.trim());
}

// ─────────────────────────────────────────────────────
// Action buttons (View + Edit + conditionally Archive)
// ─────────────────────────────────────────────────────
interface ActionsProps {
  listing: HostListingRow;
  onArchive: (listing: HostListingRow) => void;
}

function ListingActions({ listing, onArchive }: ActionsProps) {
  const canArchive = listing.status === 'PUBLISHED' || listing.status === 'PAUSED';
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/host/listings/${listing.id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#252923] border border-[#E5E0D5] hover:border-[#234B36] hover:text-[#234B36] hover:bg-[#F8F5ED] transition"
        title="View listing"
      >
        <Eye className="w-3.5 h-3.5" />
        View
      </Link>
      <Link
        href={`/host/listings/${listing.id}/edit`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#252923] border border-[#E5E0D5] hover:border-[#234B36] hover:text-[#234B36] hover:bg-[#F8F5ED] transition"
        title="Edit listing"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </Link>
      {canArchive && (
        <button
          onClick={() => onArchive(listing)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 transition cursor-pointer"
          title="Archive listing"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Desktop table row
// ─────────────────────────────────────────────────────
function TableRow({
  listing,
  onArchive,
}: {
  listing: HostListingRow;
  onArchive: (l: HostListingRow) => void;
}) {
  return (
    <tr className="border-b border-[#EEF3EF] hover:bg-[#F8F5ED]/80 transition-colors group">
      {/* Property */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <CoverThumb src={listing.coverImage} alt={listing.title} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#252923] truncate max-w-[200px]">{listing.title}</p>
            <p className="text-xs text-[#73776F] mt-0.5">
              {listing.bedrooms}bd · {listing.bathrooms}ba
            </p>
          </div>
        </div>
      </td>
      {/* Type */}
      <td className="py-3 px-4">
        <TypeBadge type={listing.listingType} />
      </td>
      {/* Location */}
      <td className="py-3 px-4">
        <p className="text-sm text-[#252923] font-medium">{listing.city}</p>
        {listing.subCity && (
          <p className="text-xs text-[#73776F]">{listing.subCity}</p>
        )}
      </td>
      {/* Price */}
      <td className="py-3 px-4">
        <p className="text-sm font-bold text-[#252923] whitespace-nowrap">{formatPrice(listing)}</p>
      </td>
      {/* Status */}
      <td className="py-3 px-4">
        <StatusBadge
          status={listing.status}
          adminHidden={listing.adminHidden}
          hasPendingReview={listing.hasPendingReview}
          pendingReviewType={listing.pendingReviewType}
          rejectionReason={listing.rejectionReason}
        />
      </td>
      {/* Updated */}
      <td className="py-3 px-4">
        <p className="text-xs text-[#73776F] whitespace-nowrap">
          {new Date(listing.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </td>
      {/* Actions */}
      <td className="py-3 px-4">
        <ListingActions listing={listing} onArchive={onArchive} />
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────
// Mobile card
// ─────────────────────────────────────────────────────
function MobileCard({
  listing,
  onArchive,
}: {
  listing: HostListingRow;
  onArchive: (l: HostListingRow) => void;
}) {
  return (
    <div className="bg-white border border-[#E5E0D5] rounded-2xl p-4">
      <div className="flex gap-3 mb-3">
        <CoverThumb src={listing.coverImage} alt={listing.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#252923] leading-tight truncate">
              {listing.title}
            </p>
            <StatusBadge
              status={listing.status}
              adminHidden={listing.adminHidden}
              hasPendingReview={listing.hasPendingReview}
              pendingReviewType={listing.pendingReviewType}
              rejectionReason={listing.rejectionReason}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={listing.listingType} />
            <span className="text-xs text-[#73776F]">
              {listing.bedrooms}bd · {listing.bathrooms}ba
            </span>
          </div>
          <p className="text-xs font-bold text-[#234B36] mt-1">{formatPrice(listing)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#73776F]">
          {listing.city}{listing.subCity ? `, ${listing.subCity}` : ''}
        </p>
        <ListingActions listing={listing} onArchive={onArchive} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────
export default function HostListingsPage() {
  // ── State ──
  const [response, setResponse] = useState<HostListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter state
  const [query, setQuery] = useState<HostListingsQuery>({
    listingType: '',
    status: '',
    city: '',
    subCity: '',
    search: '',
    page: 1,
    limit: LIMIT,
  });
  // Local search input (debounced)
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Archive modal
  const [archivingListing, setArchivingListing] = useState<HostListingRow | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch listings ──
  useEffect(() => {
    let active = true;

    const loadListings = async () => {
      try {
        const params = new URLSearchParams();
        if (query.listingType) params.set('listingType', query.listingType);
        if (query.status)      params.set('status', query.status);
        if (query.city?.trim())    params.set('city', query.city.trim());
        if (query.subCity?.trim()) params.set('subCity', query.subCity.trim());
        if (query.search?.trim())  params.set('search', query.search.trim());
        params.set('page', String(query.page ?? 1));
        params.set('limit', String(query.limit ?? LIMIT));

        const data = await apiFetch<HostListingsResponse>(`/host/listings?${params.toString()}`);
        if (!active) return;
        setResponse(data);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load listings.');
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

    void loadListings();

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  // ── Debounced search ──
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: value, page: 1 }));
    }, 400);
  };

  // ── Filter change helpers ──
  const setFilter = <K extends keyof HostListingsQuery>(key: K, value: HostListingsQuery[K]) => {
    setQuery((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setQuery({ listingType: '', status: '', city: '', subCity: '', search: '', page: 1, limit: LIMIT });
  };

  // ── Archive ──
  const handleArchiveConfirm = async () => {
    if (!archivingListing) return;
    setArchiveLoading(true);
    try {
      await apiFetch(`/host/listings/${archivingListing.id}/archive`, { method: 'PATCH' });
      setArchivingListing(null);
      showToast('Listing archived successfully.', 'success');
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setArchivingListing(null);
      showToast(err instanceof Error ? err.message : 'Failed to archive listing.', 'error');
    } finally {
      setArchiveLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Derived ──
  const activeFilters = hasActiveFilters(query);
  const isEmpty = !loading && !error && response?.total === 0;
  const isFilteredEmpty = isEmpty && activeFilters;
  const isBlankEmpty = isEmpty && !activeFilters;
  const listings = response?.data ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold border transition-all ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-700'
              : 'bg-white border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success' ? '✓' : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Archive modal ── */}
      {archivingListing && (
        <ArchiveModal
          listing={archivingListing}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchivingListing(null)}
          isLoading={archiveLoading}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#252923] leading-tight">My Listings</h1>
          <p className="text-sm text-[#73776F] mt-0.5">
            Manage all your rental and sale property listings.
          </p>
        </div>
        <Link
          href="/host/listings/new"
          className="inline-flex items-center gap-2 bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Listing
        </Link>
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white border border-[#E5E0D5] rounded-2xl p-4 space-y-3 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#73776F]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by title or description…"
            aria-label="Search listings"
            className="w-full pl-9 pr-9 py-2.5 text-sm font-medium text-[#252923] placeholder:text-[#73776F]/60 border border-[#E5E0D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73776F] hover:text-[#252923] transition cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <Filter className="w-3.5 h-3.5 text-[#73776F] flex-shrink-0" />

          {/* Listing type */}
          <select
            value={query.listingType ?? ''}
            onChange={(e) => setFilter('listingType', e.target.value as ListingType | '')}
            aria-label="Filter by listing type"
            className="text-sm font-semibold text-[#252923] border border-[#E5E0D5] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] bg-white cursor-pointer transition"
          >
            {LISTING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={query.status ?? ''}
            onChange={(e) => setFilter('status', e.target.value as ListingStatus | '')}
            aria-label="Filter by status"
            className="text-sm font-semibold text-[#252923] border border-[#E5E0D5] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] bg-white cursor-pointer transition"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* City */}
          <input
            type="text"
            value={query.city ?? ''}
            onChange={(e) => setFilter('city', e.target.value)}
            placeholder="City"
            aria-label="Filter by city"
            className="text-sm font-semibold text-[#252923] border border-[#E5E0D5] rounded-lg px-3 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition placeholder:text-[#73776F]/60"
          />

          {/* Sub-city */}
          <input
            type="text"
            value={query.subCity ?? ''}
            onChange={(e) => setFilter('subCity', e.target.value)}
            placeholder="Sub-city"
            aria-label="Filter by sub-city"
            className="text-sm font-semibold text-[#252923] border border-[#E5E0D5] rounded-lg px-3 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition placeholder:text-[#73776F]/60"
          />

          {/* Reset */}
          {activeFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#73776F] hover:text-[#252923] border border-[#E5E0D5] px-3 py-1.5 rounded-lg hover:bg-[#F8F5ED] transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}

      {/* Error state */}
      {error && (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-[#252923] mb-2">Failed to load listings</h3>
          <p className="text-sm text-[#73776F] mb-5">{error}</p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Blank empty state (no listings at all) */}
      {isBlankEmpty && (
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF3EF] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-8 h-8 text-[#234B36]" />
          </div>
          <h3 className="text-lg font-black text-[#252923] mb-2">No listings yet</h3>
          <p className="text-sm text-[#73776F] mb-6 max-w-xs mx-auto leading-relaxed">
            Create your first property listing to start receiving guests or buyers on Engida.
          </p>
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create your first listing
          </Link>
        </div>
      )}

      {/* Filtered empty state */}
      {isFilteredEmpty && (
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-[#73776F]" />
          </div>
          <h3 className="text-base font-bold text-[#252923] mb-2">No listings match your filters</h3>
          <p className="text-sm text-[#73776F] mb-5">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 border border-[#E5E0D5] text-sm font-bold text-[#252923] px-5 py-2.5 rounded-xl hover:bg-[#F8F5ED] transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Clear filters
          </button>
        </div>
      )}

      {/* Desktop table */}
      {!error && (loading || listings.length > 0) && (
        <>
          {/* Table — hidden on mobile */}
          <div className="hidden md:block bg-white border border-[#E5E0D5] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full" aria-label="Listings table">
              <thead>
                <tr className="border-b border-[#EEF3EF] bg-[#F8F5ED]">
                  {['Property', 'Type', 'Location', 'Price', 'Status', 'Updated', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-black text-[#73776F] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : listings.map((listing) => (
                      <TableRow
                        key={listing.id}
                        listing={listing}
                        onArchive={setArchivingListing}
                      />
                    ))}
              </tbody>
            </table>

            {!loading && response && (
              <div className="px-4 py-3">
                <Pagination
                  page={response.page}
                  totalPages={response.totalPages}
                  total={response.total}
                  limit={response.limit}
                  onPage={(p) => setQuery((prev) => ({ ...prev, page: p }))}
                />
              </div>
            )}
          </div>

          {/* Mobile cards — shown instead of table on small screens */}
          <div className="md:hidden space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : listings.map((listing) => (
                  <MobileCard
                    key={listing.id}
                    listing={listing}
                    onArchive={setArchivingListing}
                  />
                ))}
            {!loading && response && (
              <Pagination
                page={response.page}
                totalPages={response.totalPages}
                total={response.total}
                limit={response.limit}
                onPage={(p) => setQuery((prev) => ({ ...prev, page: p }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
