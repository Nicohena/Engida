'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, downloadAuthedFile } from '../../../lib/api';
import type {
  ReviewSubmissionType,
  ReviewStatus,
  HostProfile,
} from '../../../types/host';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  Layers,
  AlertTriangle,
  RefreshCw,
  Eye,
  Check,
  X,
  User,
  Calendar,
  MapPin,
  AlertOctagon,
  FileText,
  BadgeCheck,
  Download,
  Phone,
  Mail,
} from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  propertyId: string;
  submissionType: ReviewSubmissionType;
  status: ReviewStatus;
  proposedChanges: Record<string, unknown> | null;
  submittedByHostId: string;
  submittedAt: string;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
  property?: {
    id: string;
    title: string;
    propertyType: string;
    listingType: string;
    pricePerNight?: number;
    salePrice?: number;
    city: string;
    address: string;
    coverImage?: string;
    status: string;
    adminHidden?: boolean;
    adminHiddenReason?: string;
  };
  submittedByHost?: {
    id: string;
    fullName: string;
    email: string;
  };
  reviewedByAdmin?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface AdminListingProperty {
  id?: string;
  title?: string;
  propertyType?: string;
  listingType?: string;
  pricePerNight?: number;
  salePrice?: number;
  city?: string;
  address?: string;
  status?: string;
  adminHidden?: boolean;
  adminHiddenReason?: string;
  adminHiddenAt?: string;
  coverImage?: string;
  maxGuests?: number;
  bedrooms?: number;
  description?: string;
  images?: string[];
  [key: string]: unknown;
}

interface ReviewDetailResponse {
  review: ReviewQueueItem;
  property: AdminListingProperty;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diff: Record<string, { current: any; proposed: any }> | null;
}

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<
    'pending' | 'all' | 'takedowns' | 'host-verifications'
  >('pending');
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingListings, setExportingListings] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stats
  const [stats, setStats] = useState({
    pendingTotal: 0,
    pendingInitial: 0,
    pendingEdits: 0,
    approvedTotal: 0,
    rejectedTotal: 0,
  });

  // Modal inspection state
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewDetail, setReviewDetail] = useState<ReviewDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Decision states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Takedown Console State
  const [takedownPropertyId, setTakedownPropertyId] = useState('');
  const [takedownListing, setTakedownListing] = useState<AdminListingProperty | null>(null);
  const [takedownLoading, setTakedownLoading] = useState(false);
  const [takedownReason, setTakedownReason] = useState('');
  const [takedownMessage, setTakedownMessage] = useState<string | null>(null);
  const [takedownError, setTakedownError] = useState<string | null>(null);

  // ── Host Verification Console State ──
  const [hostVerifications, setHostVerifications] = useState<HostProfile[]>([]);
  const [loadingHostVerif, setLoadingHostVerif] = useState(false);
  const [hostVerifError, setHostVerifError] = useState<string | null>(null);
  const [hostVerifSuccess, setHostVerifSuccess] = useState<string | null>(null);
  const [hostVerifStatusFilter, setHostVerifStatusFilter] = useState<string>('PENDING');
  const [hostVerifSearch, setHostVerifSearch] = useState('');
  const [pendingHostCount, setPendingHostCount] = useState(0);

  // Host Verification Decision Modal
  const [approvingHostId, setApprovingHostId] = useState<string | null>(null);
  const [rejectingHostProfile, setRejectingHostProfile] = useState<HostProfile | null>(null);
  const [hostRejectionExplanation, setHostRejectionExplanation] = useState('');
  const [hostRejectionModalError, setHostRejectionModalError] = useState<string | null>(null);
  const [submittingHostRejection, setSubmittingHostRejection] = useState(false);

  const exportListings = async () => {
    setExportingListings(true);
    setExportNotice(null);
    try {
      await downloadAuthedFile('/admin/listings/export.csv', 'engida-listings.csv');
    } catch (err) {
      setExportNotice(
        err instanceof Error ? err.message : 'The listing export could not be prepared.',
      );
    } finally {
      setExportingListings(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Load Reviews Queue
  // ─────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query string
      const params = new URLSearchParams();
      if (activeTab === 'pending') {
        params.append('status', 'PENDING');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (typeFilter) {
        params.append('submissionType', typeFilter);
      }
      params.append('limit', '50');

      const data = await apiFetch<{
        data: ReviewQueueItem[];
        total: number;
      }>(`/admin/reviews?${params.toString()}`);

      setReviews(data.data || []);

      // Calculate stats from data
      const pendingItems = (data.data || []).filter((r) => r.status === 'PENDING');
      setStats({
        pendingTotal: pendingItems.length,
        pendingInitial: pendingItems.filter((r) => r.submissionType === 'INITIAL_PUBLISH').length,
        pendingEdits: pendingItems.filter((r) => r.submissionType === 'IMPORTANT_EDIT').length,
        approvedTotal: (data.data || []).filter((r) => r.status === 'APPROVED').length,
        rejectedTotal: (data.data || []).filter((r) => r.status === 'REJECTED').length,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load review queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, typeFilter]);

  // ─────────────────────────────────────────────────────────────
  // 1B. Load Host Verifications
  // ─────────────────────────────────────────────────────────────
  const fetchHostVerifications = useCallback(async () => {
    try {
      setLoadingHostVerif(true);
      setHostVerifError(null);

      const params = new URLSearchParams();
      if (hostVerifStatusFilter) {
        params.append('status', hostVerifStatusFilter);
      }
      if (hostVerifSearch.trim()) {
        params.append('search', hostVerifSearch.trim());
      }
      params.append('limit', '50');

      const data = await apiFetch<{
        data: HostProfile[];
        total: number;
      }>(`/admin/host-verifications?${params.toString()}`);

      setHostVerifications(data.data || []);

      if (hostVerifStatusFilter === 'PENDING') {
        setPendingHostCount(data.total || (data.data || []).length);
      }
    } catch (err: unknown) {
      setHostVerifError(
        err instanceof Error ? err.message : 'Failed to load host verifications.',
      );
    } finally {
      setLoadingHostVerif(false);
    }
  }, [hostVerifStatusFilter, hostVerifSearch]);

  const handleApproveHost = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to approve this host identity verification?')) {
      return;
    }
    try {
      setApprovingHostId(profileId);
      setHostVerifError(null);
      setHostVerifSuccess(null);

      await apiFetch<HostProfile>(`/admin/host-verifications/${profileId}/approve`, {
        method: 'POST',
      });

      setHostVerifSuccess('Host verification approved! The host has been notified.');
      await fetchHostVerifications();
    } catch (err: unknown) {
      setHostVerifError(
        err instanceof Error ? err.message : 'Failed to approve host verification.',
      );
    } finally {
      setApprovingHostId(null);
    }
  };

  const handleRejectHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingHostProfile) return;

    const trimmed = hostRejectionExplanation.trim();
    if (trimmed.length < 5) {
      setHostRejectionModalError('Please provide an explanation of at least 5 characters.');
      return;
    }

    try {
      setSubmittingHostRejection(true);
      setHostRejectionModalError(null);
      setHostVerifError(null);

      await apiFetch<HostProfile>(`/admin/host-verifications/${rejectingHostProfile.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ explanation: trimmed }),
      });

      setHostVerifSuccess(
        `Host verification for "${rejectingHostProfile.displayName || 'Host'}" was rejected. Feedback has been sent to the host.`,
      );
      setRejectingHostProfile(null);
      setHostRejectionExplanation('');
      await fetchHostVerifications();
    } catch (err: unknown) {
      setHostRejectionModalError(
        err instanceof Error ? err.message : 'Failed to reject host verification.',
      );
    } finally {
      setSubmittingHostRejection(false);
    }
  };

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      if (activeTab === 'host-verifications') {
        void fetchHostVerifications();
      } else if (activeTab !== 'takedowns') {
        void fetchReviews();
      }
    });

    return () => {
      active = false;
    };
  }, [fetchReviews, fetchHostVerifications, activeTab]);

  // ─────────────────────────────────────────────────────────────
  // 2. Load Detailed Review & Diff
  // ─────────────────────────────────────────────────────────────
  const openReviewDetail = async (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await apiFetch<ReviewDetailResponse>(`/admin/reviews/${reviewId}`);
      setReviewDetail(data);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load review details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeReviewDetail = () => {
    setSelectedReviewId(null);
    setReviewDetail(null);
    setDetailError(null);
    setRejectionModalOpen(false);
    setRejectionReason('');
    setRejectionError(null);
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Approval Action
  // ─────────────────────────────────────────────────────────────
  const handleApprove = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to approve this listing submission?')) {
      return;
    }
    setActionInProgress(reviewId);
    try {
      await apiFetch(`/admin/reviews/${reviewId}/approve`, {
        method: 'POST',
      });
      closeReviewDetail();
      fetchReviews();
    } catch (err: unknown) {
      alert(`Approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Rejection Action
  // ─────────────────────────────────────────────────────────────
  const handleRejectSubmit = async () => {
    if (!selectedReviewId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setRejectionError('A clear rejection reason of at least 5 characters is mandatory.');
      return;
    }

    setActionInProgress(selectedReviewId);
    try {
      await apiFetch(`/admin/reviews/${selectedReviewId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      closeReviewDetail();
      fetchReviews();
    } catch (err: unknown) {
      setRejectionError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setActionInProgress(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Takedown Console Search & Actions
  // ─────────────────────────────────────────────────────────────
  const handleLookupListing = async () => {
    if (!takedownPropertyId.trim()) return;
    setTakedownLoading(true);
    setTakedownError(null);
    setTakedownMessage(null);
    setTakedownListing(null);

    try {
      // Find property by ID using reviews or general endpoint
      const res = await apiFetch<AdminListingProperty>(`/properties/${takedownPropertyId.trim()}`);
      setTakedownListing(res);
    } catch (err: unknown) {
      setTakedownError(
        `Could not find listing: ${err instanceof Error ? err.message : 'Listing not found'}`,
      );
    } finally {
      setTakedownLoading(false);
    }
  };

  const handleHideListing = async () => {
    if (!takedownListing || !takedownReason.trim()) {
      setTakedownError('Mandatory takedown reason is required.');
      return;
    }
    setTakedownLoading(true);
    setTakedownError(null);
    try {
      const res = await apiFetch<{ property: AdminListingProperty }>(
        `/admin/listings/${takedownListing.id as string}/hide`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: takedownReason.trim() }),
        },
      );
      setTakedownMessage('Listing has been immediately placed on administrative hold.');
      setTakedownListing(res.property);
      setTakedownReason('');
    } catch (err: unknown) {
      setTakedownError(`Failed to hide listing: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTakedownLoading(false);
    }
  };

  const handleRestoreListing = async () => {
    if (!takedownListing) return;
    if (!window.confirm('Restore this listing back to public discovery and reservations?')) {
      return;
    }
    setTakedownLoading(true);
    setTakedownError(null);
    try {
      const res = await apiFetch<{ property: AdminListingProperty }>(
        `/admin/listings/${takedownListing.id as string}/restore`,
        {
          method: 'POST',
        },
      );
      setTakedownMessage('Listing has been restored to active public status.');
      setTakedownListing(res.property);
    } catch (err: unknown) {
      setTakedownError(
        `Failed to restore listing: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setTakedownLoading(false);
    }
  };

  // Filter reviews by search query (title, host, id)
  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = r.property?.title?.toLowerCase() || '';
    const host = r.submittedByHost?.fullName?.toLowerCase() || '';
    const hostEmail = r.submittedByHost?.email?.toLowerCase() || '';
    const propId = r.propertyId?.toLowerCase() || '';
    return title.includes(q) || host.includes(q) || hostEmail.includes(q) || propId.includes(q);
  });

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="space-y-8">
        <AdminPageHeader
          title="Moderation"
          description="Review new property publications, inspect live edit proposals, and enforce safety holds."
          actions={
            <>
              <button
                type="button"
                onClick={() => void exportListings()}
                disabled={exportingListings}
                className="admin-btn admin-btn-secondary"
              >
                <Download className="h-4 w-4" strokeWidth={1.8} />
                {exportingListings ? 'Preparing…' : 'Export listings'}
              </button>
              <button
                type="button"
                onClick={() => fetchReviews()}
                disabled={loading}
                className="admin-btn admin-btn-secondary"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                Refresh queue
              </button>
            </>
          }
        />

        {exportNotice && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-[#ecd0c9] bg-[#f8e9e5] p-4 text-sm text-[#8f4035]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 font-medium">{exportNotice}</p>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              className="rounded p-0.5 text-[#7a6b5f] hover:text-[#6c5d52]"
              aria-label="Dismiss export message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Moderation summary ── */}
        <section className="admin-panel overflow-hidden" aria-label="Moderation summary">
          <div className="grid grid-cols-2 gap-px bg-[#ece4d9] md:grid-cols-4">
            <div className="bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                <span>Pending reviews</span>
                <Clock className="h-4 w-4 text-[#b37936]" strokeWidth={1.8} />
              </div>
              <p className="admin-numeric mt-3 font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                {stats.pendingTotal}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#9a671f]">
                Requires admin decision
              </p>
            </div>

            <div className="bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                <span>New publications</span>
                <Building2 className="h-4 w-4 text-[#b3541e]" strokeWidth={1.8} />
              </div>
              <p className="admin-numeric mt-3 font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                {stats.pendingInitial}
              </p>
              <p className="mt-2 text-xs text-[#7a6b5f]">Initial property launches</p>
            </div>

            <div className="bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                <span>Important edits</span>
                <Layers className="h-4 w-4 text-[#8b4b2c]" strokeWidth={1.8} />
              </div>
              <p className="admin-numeric mt-3 font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                {stats.pendingEdits}
              </p>
              <p className="mt-2 text-xs text-[#7a6b5f]">Live listings pending updates</p>
            </div>

            <div className="bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                <span>Action complete</span>
                <CheckCircle2 className="h-4 w-4 text-[#4f6648]" strokeWidth={1.8} />
              </div>
              <p className="admin-numeric mt-3 font-headline text-3xl font-semibold leading-none text-[#3a302a]">
                {stats.approvedTotal + stats.rejectedTotal}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#4f6648]">
                Processed submissions
              </p>
            </div>
          </div>
        </section>

        {/* ── Main Console Tabs ── */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Moderation queues">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            onClick={() => {
              setActiveTab('pending');
              setStatusFilter('PENDING');
            }}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
              activeTab === 'pending'
                ? 'border-[#e0c3ae] bg-[#f8ebe0] text-[#9f4a19]'
                : 'border-[#d8d0c8] bg-white text-[#5a4c42] hover:border-[#c9bdb1] hover:bg-[#fbf7f1]'
            }`}
          >
            <Clock className="h-4 w-4" strokeWidth={1.8} /> Pending queue
            {stats.pendingTotal > 0 && (
              <span className="rounded-full bg-[#f4e6d5] px-2 py-0.5 text-xs font-bold text-[#7a531c]">
                {stats.pendingTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('');
            }}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
              activeTab === 'all'
                ? 'border-[#e0c3ae] bg-[#f8ebe0] text-[#9f4a19]'
                : 'border-[#d8d0c8] bg-white text-[#5a4c42] hover:border-[#c9bdb1] hover:bg-[#fbf7f1]'
            }`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.8} /> Moderation history
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'takedowns'}
            onClick={() => setActiveTab('takedowns')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
              activeTab === 'takedowns'
                ? 'border-[#e4beb5] bg-[#f8e9e5] text-[#8f4035]'
                : 'border-[#d8d0c8] bg-white text-[#5a4c42] hover:border-[#c9bdb1] hover:bg-[#fbf7f1]'
            }`}
          >
            <ShieldAlert className="h-4 w-4" strokeWidth={1.8} /> Safety holds
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'host-verifications'}
            onClick={() => setActiveTab('host-verifications')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
              activeTab === 'host-verifications'
                ? 'border-[#e0c3ae] bg-[#f8ebe0] text-[#9f4a19]'
                : 'border-[#d8d0c8] bg-white text-[#5a4c42] hover:border-[#c9bdb1] hover:bg-[#fbf7f1]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} /> Host verifications
            {pendingHostCount > 0 && (
              <span className="rounded-full bg-[#efe2ce] px-2 py-0.5 text-xs font-bold text-[#8f3f13]">
                {pendingHostCount}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1 & 2: Review Queue & History ── */}
        {activeTab !== 'takedowns' && activeTab !== 'host-verifications' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8c80]" />
                <input
                  type="text"
                  placeholder="Filter by listing title, host, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#3a302a] bg-white focus:outline-none focus:ring-2 focus:ring-[#b3541e]/20"
                >
                  <option value="">All Submission Types</option>
                  <option value="INITIAL_PUBLISH">Initial Publications</option>
                  <option value="IMPORTANT_EDIT">Important Edit Proposals</option>
                </select>

                {/* Status Filter for 'all' tab */}
                {activeTab === 'all' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#3a302a] bg-white focus:outline-none focus:ring-2 focus:ring-[#b3541e]/20"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                )}
              </div>
            </div>

            {/* Queue List Table / Cards */}
            {loading ? (
              <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center text-[#7a6b5f] space-y-3">
                <div className="w-8 h-8 border-3 border-[#b3541e] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold">Loading listing moderation queue…</p>
              </div>
            ) : error ? (
              <div className="bg-[#f8e9e5] border border-[#ecd0c9] rounded-2xl p-6 text-center text-[#8f4035] space-y-2">
                <AlertTriangle className="w-8 h-8 text-[#a24b3e] mx-auto" />
                <p className="text-sm font-bold">Error loading review queue</p>
                <p className="text-xs">{error}</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white border border-[#d8d0c8] rounded-2xl p-10">
                <div className="mx-auto flex max-w-md items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1e8] text-[#5d7554]">
                    <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2 className="font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">Queue is clear</h2>
                    <p className="mt-1 text-xs leading-5 text-[#7a6b5f]">
                      {activeTab === 'pending'
                        ? 'There are currently no listings or proposals awaiting administrative review.'
                        : 'No moderation records found matching the selected filters.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#d8d0c8] rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-[#f1eae0]">
                  {filteredReviews.map((rev) => {
                    const isPending = rev.status === 'PENDING';
                    const isInitial = rev.submissionType === 'INITIAL_PUBLISH';
                    const prop = rev.property;

                    return (
                      <div
                        key={rev.id}
                        className="p-4 md:p-5 hover:bg-[#fbf7f1] transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-start gap-3.5">
                          {/* Property Cover / Thumbnail */}
                          <div className="w-16 h-16 rounded-xl bg-[#efe7dc] border border-[#d8d0c8] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {prop?.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prop.coverImage}
                                alt={prop.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-[#9b8c80]" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Submission Type Badge */}
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isInitial
                                    ? 'bg-[#efe2ce] text-[#7b5c33] border border-[#e3d5c1]'
                                    : 'bg-[#f3e7df] text-[#7d352b] border border-[#ecdbcf]'
                                }`}
                              >
                                {isInitial ? 'Initial Publication' : 'Important Edit Proposal'}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  rev.status === 'PENDING'
                                    ? 'bg-[#f4e6d5] text-[#7a531c] border border-[#ecd9c2]'
                                    : rev.status === 'APPROVED'
                                    ? 'bg-[#e3e9dc] text-[#405a3a] border border-[#d6dfcd]'
                                    : rev.status === 'REJECTED'
                                    ? 'bg-[#f3dcd6] text-[#7d352b] border border-[#ecd0c9]'
                                    : 'bg-[#efe7dc] text-[#4a3e35] border border-[#d8d0c8]'
                                }`}
                              >
                                {rev.status}
                              </span>

                              {prop?.adminHidden && (
                                <span className="bg-[#a24b3e] text-white text-[11px] font-black px-1.5 py-0.5 rounded">
                                  ADMIN HOLD
                                </span>
                              )}
                            </div>

                            <p className="text-base font-bold text-[#3a302a] leading-snug">
                              {prop?.title || 'Untitled Property'}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7a6b5f]">
                              <span className="flex items-center gap-1 font-semibold text-[#3a302a]">
                                <MapPin className="w-3.5 h-3.5 text-[#b3541e]" />
                                {prop?.city || 'Unknown City'}
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-[#3a302a]">
                                <User className="w-3.5 h-3.5 text-[#7a6b5f]" />
                                Host: {rev.submittedByHost?.fullName || 'Host'} (
                                {rev.submittedByHost?.email || 'N/A'})
                              </span>

                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#9b8c80]" />
                                Submitted:{' '}
                                {rev.submittedAt
                                  ? new Date(rev.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : rev.createdAt
                                  ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'N/A'}
                              </span>
                            </div>

                            {/* Rejection notice snippet if rejected */}
                            {rev.status === 'REJECTED' && rev.rejectionReason && (
                              <p className="text-xs text-[#8f4035] bg-[#f8e9e5] border border-[#ecd0c9] rounded-lg p-2 mt-1">
                                <strong>Rejection Reason:</strong> {rev.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-end lg:self-center">
                          <button
                            onClick={() => openReviewDetail(rev.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d8d0c8] bg-white text-xs font-bold text-[#3a302a] hover:bg-[#f1e5d8]/50 transition shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#b3541e]" /> Inspect & Decide
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(rev.id)}
                                disabled={actionInProgress === rev.id}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#5d7554] hover:bg-[#4f6648] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedReviewId(rev.id);
                                  setRejectionModalOpen(true);
                                }}
                                disabled={actionInProgress === rev.id}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#a24b3e] hover:bg-[#8f4035] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" /> Reject…
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Takedown / Administrative Hold Console ── */}
        {activeTab === 'takedowns' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1eae0]">
                <ShieldAlert className="w-5 h-5 text-[#a24b3e]" />
                <div>
                  <h2 className="font-headline text-2xl font-semibold tracking-[-0.015em] text-[#3a302a]">
                    Emergency takedown & safety hold
                  </h2>
                  <p className="text-xs text-[#7a6b5f]">
                    Instantly hide any property from search discovery and booking reservations in
                    cases of safety violations, dispute, fraud, or policy infringement.
                  </p>
                </div>
              </div>

              {/* Property Search by ID */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Property UUID (e.g. 1a2b3c4d-...)"
                  value={takedownPropertyId}
                  onChange={(e) => setTakedownPropertyId(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#b3541e]/20"
                />
                <button
                  type="button"
                  onClick={handleLookupListing}
                  disabled={takedownLoading || !takedownPropertyId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#b3541e] hover:bg-[#8f3f13] text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Lookup
                </button>
              </div>

              {/* Takedown Status messages */}
              {takedownMessage && (
                <div className="p-3.5 rounded-xl bg-[#edf1e8] border border-[#d6dfcd] text-xs font-bold text-[#405a3a] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5d7554] flex-shrink-0" />
                  {takedownMessage}
                </div>
              )}
              {takedownError && (
                <div className="p-3.5 rounded-xl bg-[#f8e9e5] border border-[#ecd0c9] text-xs font-bold text-[#7d352b] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#a24b3e] flex-shrink-0" />
                  {takedownError}
                </div>
              )}

              {/* Takedown Listing Result Card */}
              {takedownListing && (
                <div className="bg-[#fbf7f1] border border-[#d8d0c8] rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#7a6b5f] uppercase tracking-wider block">
                        Listing ID: {takedownListing.id}
                      </span>
                      <p className="text-base font-semibold text-[#3a302a] mt-0.5">
                        {takedownListing.title}
                      </p>
                      <p className="text-xs text-[#7a6b5f]">
                        {takedownListing.address}, {takedownListing.city} • Status:{' '}
                        <strong className="text-[#3a302a]">{takedownListing.status}</strong>
                      </p>
                    </div>

                    <div>
                      {takedownListing.adminHidden ? (
                        <span className="bg-[#a24b3e] text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          ADMIN HOLD ACTIVE
                        </span>
                      ) : (
                        <span className="bg-[#e3e9dc] text-[#405a3a] border border-[#d6dfcd] text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          PUBLIC / ACCESSIBLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If currently hidden */}
                  {takedownListing.adminHidden ? (
                    <div className="space-y-3 pt-3 border-t border-[#d8d0c8]/60">
                      <div className="bg-[#f8e9e5] border border-[#ecd0c9] rounded-xl p-3 text-xs text-[#5e2a24] space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4 text-[#a24b3e]" /> Administrative Hold
                          Details:
                        </p>
                        <p>
                          <strong>Reason:</strong> {takedownListing.adminHiddenReason || 'No reason specified'}
                        </p>
                        {takedownListing.adminHiddenAt && (
                          <p className="text-[#8f4035]">
                            <strong>Date Enforced:</strong>{' '}
                            {new Date(takedownListing.adminHiddenAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={handleRestoreListing}
                        disabled={takedownLoading}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5d7554] hover:bg-[#4f6648] text-white text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Restore Listing to Public
                      </button>
                    </div>
                  ) : (
                    /* If active, allow takedown */
                    <div className="space-y-3 pt-3 border-t border-[#d8d0c8]/60">
                      <label className="block text-xs font-bold text-[#3a302a]">
                        Mandatory Reason for Administrative Hold <span className="text-[#a24b3e]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={takedownReason}
                        onChange={(e) => setTakedownReason(e.target.value)}
                        placeholder="Explain specifically why this listing is being pulled down (e.g. Host identity fraud investigation, Safety hazard reported by guest, Unverified ownership)..."
                        className="w-full px-3 py-2 rounded-xl border border-[#d8d0c8] text-xs font-medium text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#b56a5d]"
                      />
                      <button
                        onClick={handleHideListing}
                        disabled={takedownLoading || !takedownReason.trim()}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#a24b3e] hover:bg-[#8f4035] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                      >
                        <ShieldAlert className="w-4 h-4" /> Enforce Immediate Administrative Hold
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: Host Identity Verification Console ── */}
        {activeTab === 'host-verifications' && (
          <div className="space-y-4">
            {hostVerifSuccess && (
              <div className="p-4 rounded-2xl bg-[#edf1e8] border border-[#d6dfcd] text-[#405a3a] text-xs sm:text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#5d7554] shrink-0" />
                  <span>{hostVerifSuccess}</span>
                </div>
                <button
                  onClick={() => setHostVerifSuccess(null)}
                  className="text-[#4f6648] hover:text-[#3f5338] text-xs font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {hostVerifError && (
              <div className="p-4 rounded-2xl bg-[#f8e9e5] border border-[#ecd0c9] text-[#7d352b] text-xs sm:text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#a24b3e] shrink-0" />
                  <span>{hostVerifError}</span>
                </div>
                <button
                  onClick={() => setHostVerifError(null)}
                  className="text-[#8f4035] hover:text-[#5e2a24] text-xs font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8c80]" />
                <input
                  type="text"
                  placeholder="Search by host display name, legal name, email, or phone..."
                  value={hostVerifSearch}
                  onChange={(e) => setHostVerifSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={hostVerifStatusFilter}
                  onChange={(e) => setHostVerifStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#d8d0c8] text-xs font-bold text-[#3a302a] bg-white focus:outline-none focus:border-[#b3541e]"
                >
                  <option value="PENDING">Status: Pending Review</option>
                  <option value="VERIFIED">Status: Verified</option>
                  <option value="REJECTED">Status: Rejected</option>
                  <option value="">Status: All Records</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchHostVerifications()}
                  disabled={loadingHostVerif}
                  className="p-2 rounded-xl border border-[#d8d0c8] hover:bg-[#f6f0e8] text-[#7a6b5f] transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHostVerif ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Verifications List */}
            {loadingHostVerif ? (
              <div className="py-20 text-center bg-white border border-[#d8d0c8] rounded-2xl">
                <div className="w-8 h-8 border-3 border-[#b3541e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-[#7a6b5f]">Loading host verification requests...</p>
              </div>
            ) : hostVerifications.length === 0 ? (
              <div className="py-16 text-center bg-white border border-[#d8d0c8] rounded-2xl">
                <ShieldCheck className="w-12 h-12 text-[#9b8c80] mx-auto mb-3" />
                <h2 className="font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">No host verification requests</h2>
                <p className="text-xs text-[#7a6b5f] mt-1 max-w-sm mx-auto">
                  There are no host verification requests matching the selected filter criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hostVerifications.map((host) => {
                  const isPending = host.verificationStatus === 'PENDING';
                  const isVerified = host.verificationStatus === 'VERIFIED';
                  const isRejected = host.verificationStatus === 'REJECTED';

                  return (
                    <div
                      key={host.id}
                      className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-sm hover:border-[#c9bdb1] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-[#b3541e] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-inner overflow-hidden">
                          {host.user?.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={host.user.avatar}
                              alt={host.displayName || 'Host'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {(host.displayName || host.user?.name || 'H').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#3a302a]">
                              {host.displayName || 'Unnamed Host'}
                            </p>
                            <span
                              className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isVerified
                                  ? 'bg-[#edf1e8] text-[#405a3a] border-[#d6dfcd]'
                                  : isPending
                                  ? 'bg-[#f7ebda] text-[#7a531c] border-[#ecd9c2]'
                                  : isRejected
                                  ? 'bg-[#f8e9e5] text-[#7d352b] border-[#ecd0c9]'
                                  : 'bg-[#f6f0e8] text-[#5a4c42] border-[#d8d0c8]'
                              }`}
                            >
                              {host.verificationStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#7a6b5f]">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#9b8c80] shrink-0" />
                              <span className="truncate">{host.user?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-[#9b8c80] shrink-0" />
                              <span className="truncate">{host.user?.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#9b8c80] shrink-0" />
                              <span className="truncate">{host.phone || 'No phone'}</span>
                            </div>
                          </div>

                          {host.bio && (
                            <p className="text-xs text-[#6c5d52] line-clamp-2 pt-1 border-t border-[#ece4d9]">
                              {host.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Decision Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingHostProfile(host);
                                setHostRejectionExplanation('');
                                setHostRejectionModalError(null);
                              }}
                              disabled={approvingHostId !== null}
                              className="px-3.5 py-2 rounded-xl border border-[#ecd0c9] bg-[#f8e9e5] hover:bg-[#f3dcd6] text-[#8f4035] text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" /> Reject…
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveHost(host.id)}
                              disabled={approvingHostId !== null}
                              className="px-4 py-2 rounded-xl bg-[#5d7554] hover:bg-[#4f6648] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {approvingHostId === host.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <BadgeCheck className="w-4 h-4" />
                              )}
                              <span>Approve Host</span>
                            </button>
                          </>
                        ) : isVerified ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#edf1e8] text-[#4f6648] text-xs font-bold border border-[#d6dfcd]">
                            <BadgeCheck className="w-4 h-4" />
                            <span>Verified Host</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8e9e5] text-[#8f4035] text-xs font-bold border border-[#ecd0c9]">
                            <XCircle className="w-4 h-4" />
                            <span>Rejected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL: Side-by-Side Review & Diff Inspection ── */}
        {selectedReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2f2722]/55 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#d8d0c8]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#d8d0c8] flex items-center justify-between bg-[#fbf7f1]">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-[#f1e5d8] text-[#b3541e]">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-2xl font-semibold tracking-[-0.015em] text-[#3a302a]">
                      Review listing submission
                    </h2>
                    <p className="text-xs text-[#7a6b5f]">
                      {reviewDetail?.review?.submissionType === 'INITIAL_PUBLISH'
                        ? 'New Listing Publication Approval'
                        : 'Proposed Edits vs. Approved Live Version'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeReviewDetail}
                  className="p-1.5 rounded-xl text-[#9b8c80] hover:text-[#3a302a] hover:bg-[#efe7dc] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {loadingDetail ? (
                  <div className="py-16 text-center text-[#7a6b5f] space-y-3">
                    <div className="w-8 h-8 border-3 border-[#b3541e] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold">Loading inspection diff…</p>
                  </div>
                ) : detailError ? (
                  <div className="p-6 rounded-2xl bg-[#f8e9e5] border border-[#ecd0c9] text-[#7d352b] text-xs font-bold">
                    {detailError}
                  </div>
                ) : reviewDetail ? (
                  <>
                    {/* Basic Property Header */}
                    <div className="bg-[#fbf7f1] border border-[#d8d0c8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#7a6b5f] uppercase">
                            Property:
                          </span>
                          <span className="text-sm font-black text-[#3a302a]">
                            {reviewDetail.property?.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#7a6b5f] mt-0.5">
                          {reviewDetail.property?.address}, {reviewDetail.property?.city} •{' '}
                          {reviewDetail.property?.propertyType}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#7a6b5f] block">Current Status:</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#e7ded2] text-[#4a3e35] uppercase">
                          {reviewDetail.property?.status}
                        </span>
                      </div>
                    </div>

                    {/* Scenario A: IMPORTANT EDIT DIFF VIEW */}
                    {reviewDetail.review.submissionType === 'IMPORTANT_EDIT' && (
                      <div className="space-y-4">
                        <div className="bg-[#f2eadf] border border-[#e3d5c1] rounded-xl p-3.5 text-xs text-[#73532f] leading-relaxed">
                          <span className="font-bold">Important Changes Proposed:</span> The table
                          below contrasts the currently live, bookable version of this listing against
                          the changes submitted by the host. The approved public version remains
                          unchanged until you click <strong>Approve</strong>.
                        </div>

                        {reviewDetail.diff && Object.keys(reviewDetail.diff).length > 0 ? (
                          <div className="border border-[#d8d0c8] rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-[#f1eae0] font-black text-[#3a302a] border-b border-[#d8d0c8]">
                                <tr>
                                  <th className="p-3 w-1/4">Field</th>
                                  <th className="p-3 w-3/8 text-[#6c5d52]">Current Live Value</th>
                                  <th className="p-3 w-3/8 text-[#4f6648]">Proposed New Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d8d0c8]/60 font-medium">
                                {Object.entries(reviewDetail.diff).map(([key, item]) => {
                                  const isDifferent =
                                    JSON.stringify(item.current) !== JSON.stringify(item.proposed);

                                  return (
                                    <tr
                                      key={key}
                                      className={isDifferent ? 'bg-[#f7ebda]/50' : 'bg-white'}
                                    >
                                      <td className="p-3 font-bold text-[#3a302a] capitalize">
                                        {key.replace(/([A-Z])/g, ' $1')}
                                      </td>
                                      <td className="p-3 text-[#6c5d52] font-mono text-xs break-all">
                                        {Array.isArray(item.current)
                                          ? `[${item.current.length} items]`
                                          : String(item.current ?? '—')}
                                      </td>
                                      <td className="p-3 text-[#4f6648] font-bold font-mono text-xs break-all bg-[#edf1e8]/40">
                                        {Array.isArray(item.proposed)
                                          ? `[${item.proposed.length} items]`
                                          : String(item.proposed ?? '—')}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-[#7a6b5f]">No specific field diffs detected.</p>
                        )}
                      </div>
                    )}

                    {/* Scenario B: INITIAL PUBLISH REVIEW */}
                    {reviewDetail.review.submissionType === 'INITIAL_PUBLISH' && (
                      <div className="space-y-4">
                        <div className="bg-[#f2eadf] border border-[#e3d5c1] rounded-xl p-3.5 text-xs text-[#73532f] leading-relaxed">
                          <span className="font-bold">Initial Publication Quality Check:</span> Verify
                          that this property meets ENGIDA listing standards before making it
                          publicly searchable.
                        </div>

                        {/* Property summary grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-[#fbf7f1] rounded-xl border border-[#d8d0c8]">
                            <span className="text-[#7a6b5f] font-bold block">Nightly / Sale Price:</span>
                            <span className="text-sm font-black text-[#3a302a]">
                              {reviewDetail.property?.pricePerNight
                                ? `${reviewDetail.property.pricePerNight} ETB / night`
                                : `${reviewDetail.property?.salePrice || 0} ETB`}
                            </span>
                          </div>

                          <div className="p-3 bg-[#fbf7f1] rounded-xl border border-[#d8d0c8]">
                            <span className="text-[#7a6b5f] font-bold block">Capacity & Rooms:</span>
                            <span className="text-sm font-black text-[#3a302a]">
                              {reviewDetail.property?.maxGuests || 2} Guests •{' '}
                              {reviewDetail.property?.bedrooms || 1} Beds
                            </span>
                          </div>

                          <div className="p-3 bg-[#fbf7f1] rounded-xl border border-[#d8d0c8]">
                            <span className="text-[#7a6b5f] font-bold block">Property Type:</span>
                            <span className="text-sm font-black text-[#3a302a]">
                              {reviewDetail.property?.propertyType}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="p-4 bg-white rounded-xl border border-[#d8d0c8] space-y-1">
                          <span className="text-xs font-bold text-[#3a302a] block">
                            Description:
                          </span>
                          <p className="text-xs text-[#7a6b5f] leading-relaxed whitespace-pre-line">
                            {reviewDetail.property?.description}
                          </p>
                        </div>

                        {/* Images preview */}
                        {Array.isArray(reviewDetail.property?.images) &&
                          reviewDetail.property.images.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-[#3a302a] block">
                                Property Photos ({reviewDetail.property.images.length}):
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {reviewDetail.property.images.map((img: string, i: number) => (
                                  <div
                                    key={i}
                                    className="h-24 rounded-lg bg-[#efe7dc] border border-[#d8d0c8] overflow-hidden"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={img}
                                      alt="preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Rejection Reason Form (if rejection triggered) */}
                    {rejectionModalOpen && (
                      <div className="p-4 rounded-2xl bg-[#f8e9e5] border border-[#ecd0c9] space-y-3">
                        <label className="block text-xs font-bold text-[#5e2a24]">
                          Mandatory Rejection Explanation <span className="text-[#a24b3e]">*</span>
                        </label>
                        <p className="text-xs text-[#8f4035]">
                          Explain clearly to the host what needs correction before resubmission
                          (minimum 5 characters).
                        </p>
                        <textarea
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => {
                            setRejectionReason(e.target.value);
                            setRejectionError(null);
                          }}
                          placeholder="e.g. Please provide clearer photos of the bathroom, or correct the night rate..."
                          className="w-full px-3 py-2 rounded-xl border border-[#e3b9b0] text-xs font-medium text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#b56a5d] bg-white"
                        />
                        {rejectionError && (
                          <p className="text-xs font-bold text-[#a24b3e]">{rejectionError}</p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectionModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-bold text-[#3a302a] bg-white hover:bg-[#efe7dc]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectSubmit}
                            disabled={actionInProgress !== null}
                            className="px-4 py-2 rounded-xl bg-[#a24b3e] hover:bg-[#8f4035] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#d8d0c8] bg-[#fbf7f1] flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeReviewDetail}
                  className="px-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-white transition"
                >
                  Close
                </button>

                {reviewDetail?.review?.status === 'PENDING' && !rejectionModalOpen && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectionModalOpen(true)}
                      disabled={actionInProgress !== null}
                      className="px-4 py-2 rounded-xl bg-[#a24b3e] hover:bg-[#8f4035] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject with Reason…
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(selectedReviewId)}
                      disabled={actionInProgress !== null}
                      className="px-5 py-2 rounded-xl bg-[#5d7554] hover:bg-[#4f6648] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Publish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: Host Verification Rejection ── */}
        {rejectingHostProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2f2722]/55 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-[#d8d0c8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#ece4d9] flex items-center justify-between bg-[#f8e9e5]/50">
                <div className="flex items-center gap-2 text-[#8f4035]">
                  <XCircle className="w-5 h-5 text-[#a24b3e]" />
                  <h2 className="font-headline text-2xl font-semibold tracking-[-0.015em] text-[#5e2a24]">
                    Reject host verification
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingHostProfile(null);
                    setHostRejectionExplanation('');
                    setHostRejectionModalError(null);
                  }}
                  disabled={submittingHostRejection}
                  className="p-1 rounded-lg text-[#7a6b5f] hover:text-[#6c5d52] hover:bg-[#efe7dc] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleRejectHostSubmit} className="p-6 space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#f6f0e8] border border-[#d8d0c8] space-y-1">
                  <div className="text-xs font-black text-[#3a302a]">
                    Host: {rejectingHostProfile.displayName || rejectingHostProfile.user?.name || 'Unnamed Host'}
                  </div>
                  <div className="text-xs text-[#7a6b5f]">
                    Email: {rejectingHostProfile.user?.email || 'N/A'} • Phone: {rejectingHostProfile.phone || 'N/A'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="host-rejection-explanation" className="block text-xs font-bold text-[#3a302a]">
                    Required Explanation for Host <span className="text-[#a24b3e]">*</span>
                  </label>
                  <p className="text-xs text-[#7a6b5f]">
                    Provide clear, constructive feedback detailing what identity documentation or profile information requires correction before resubmission (minimum 5 characters).
                  </p>
                  <textarea
                    id="host-rejection-explanation"
                    rows={4}
                    value={hostRejectionExplanation}
                    onChange={(e) => {
                      setHostRejectionExplanation(e.target.value);
                      if (hostRejectionModalError) setHostRejectionModalError(null);
                    }}
                    placeholder="e.g. The government ID image is blurry or expired. Please upload a clear photo of your unexpired Ethiopian passport or National ID."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9bdb1] text-xs font-medium text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#a24b3e] focus:border-[#a24b3e] bg-white shadow-xs"
                    disabled={submittingHostRejection}
                  />
                  {hostRejectionModalError && (
                    <p className="text-xs font-bold text-[#a24b3e]">{hostRejectionModalError}</p>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ece4d9]">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingHostProfile(null);
                      setHostRejectionExplanation('');
                      setHostRejectionModalError(null);
                    }}
                    disabled={submittingHostRejection}
                    className="px-4 py-2 rounded-xl border border-[#c9bdb1] text-xs font-bold text-[#5a4c42] hover:bg-[#f6f0e8] transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHostRejection || hostRejectionExplanation.trim().length < 5}
                    className="px-4 py-2 rounded-xl bg-[#a24b3e] hover:bg-[#8f4035] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingHostRejection ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Rejecting…</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Confirm Rejection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
