'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { apiFetch } from '../../lib/api';
import type { ReviewSubmissionType, ReviewStatus } from '../../types/host';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Building2,
  Filter,
  Layers,
  AlertTriangle,
  RefreshCw,
  Eye,
  Check,
  X,
  ChevronRight,
  User,
  Calendar,
  DollarSign,
  MapPin,
  SlidersHorizontal,
  Home,
  AlertOctagon,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  propertyId: string;
  submissionType: ReviewSubmissionType;
  status: ReviewStatus;
  proposedChanges: Record<string, any> | null;
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

interface ReviewDetailResponse {
  review: ReviewQueueItem;
  property: any;
  diff: Record<string, { current: any; proposed: any }> | null;
}

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'takedowns'>('pending');
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [takedownListing, setTakedownListing] = useState<any | null>(null);
  const [takedownLoading, setTakedownLoading] = useState(false);
  const [takedownReason, setTakedownReason] = useState('');
  const [takedownMessage, setTakedownMessage] = useState<string | null>(null);
  const [takedownError, setTakedownError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, typeFilter]);

  useEffect(() => {
    if (activeTab !== 'takedowns') {
      fetchReviews();
    }
  }, [fetchReviews, activeTab]);

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
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load review details.');
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
    } catch (err: any) {
      alert(`Approval failed: ${err.message || 'Unknown error'}`);
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
    } catch (err: any) {
      setRejectionError(err.message || 'Rejection failed.');
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
      const res = await apiFetch<any>(`/properties/${takedownPropertyId.trim()}`);
      setTakedownListing(res);
    } catch (err: any) {
      setTakedownError(`Could not find listing: ${err.message || 'Listing not found'}`);
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
      const res = await apiFetch<any>(`/admin/listings/${takedownListing.id}/hide`, {
        method: 'POST',
        body: JSON.stringify({ reason: takedownReason.trim() }),
      });
      setTakedownMessage('Listing has been immediately placed on administrative hold.');
      setTakedownListing(res.property);
      setTakedownReason('');
    } catch (err: any) {
      setTakedownError(`Failed to hide listing: ${err.message}`);
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
      const res = await apiFetch<any>(`/admin/listings/${takedownListing.id}/restore`, {
        method: 'POST',
      });
      setTakedownMessage('Listing has been restored to active public status.');
      setTakedownListing(res.property);
    } catch (err: any) {
      setTakedownError(`Failed to restore listing: ${err.message}`);
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
      <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#E3EAF5] text-[#33599E] text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Administrative Console
              </span>
              <span className="text-xs text-[#64748B] font-semibold">ENGIDA Trust & Safety</span>
            </div>
            <h1 className="text-3xl font-black text-[#000000] tracking-tight mt-1">
              Listing Review & Moderation
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Review new property publications, inspect live edit proposals, and enforce safety holds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchReviews()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#000000] hover:bg-[#F4F7FC] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* ── Metric Cards Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Pending Reviews</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-[#000000] mt-1.5">
              {stats.pendingTotal}
            </div>
            <div className="text-xs text-amber-600 font-semibold mt-0.5">
              Requires admin decision
            </div>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>New Publications</span>
              <Building2 className="w-4 h-4 text-[#33599E]" />
            </div>
            <div className="text-2xl font-black text-[#000000] mt-1.5">
              {stats.pendingInitial}
            </div>
            <div className="text-xs text-[#64748B] font-semibold mt-0.5">
              Initial property launches
            </div>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Important Edits</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-[#000000] mt-1.5">
              {stats.pendingEdits}
            </div>
            <div className="text-xs text-[#64748B] font-semibold mt-0.5">
              Live listings pending updates
            </div>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Action Complete</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-black text-[#000000] mt-1.5">
              {stats.approvedTotal + stats.rejectedTotal}
            </div>
            <div className="text-xs text-green-600 font-semibold mt-0.5">
              Processed submissions
            </div>
          </div>
        </div>

        {/* ── Main Console Tabs ── */}
        <div className="flex items-center gap-2 border-b border-[#CBD5E1]">
          <button
            onClick={() => {
              setActiveTab('pending');
              setStatusFilter('PENDING');
            }}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-[#33599E] text-[#33599E]'
                : 'border-transparent text-[#64748B] hover:text-[#000000]'
            }`}
          >
            <Clock className="w-4 h-4" /> Pending Queue
            {stats.pendingTotal > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-black">
                {stats.pendingTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('');
            }}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-[#33599E] text-[#33599E]'
                : 'border-transparent text-[#64748B] hover:text-[#000000]'
            }`}
          >
            <FileText className="w-4 h-4" /> Moderation History
          </button>

          <button
            onClick={() => setActiveTab('takedowns')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'takedowns'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-[#64748B] hover:text-red-600'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Safety Hold & Takedown
          </button>
        </div>

        {/* ── TAB 1 & 2: Review Queue & History ── */}
        {activeTab !== 'takedowns' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Filter by listing title, host, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#000000] bg-white focus:outline-none focus:ring-2 focus:ring-[#33599E]/20"
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
                    className="px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#000000] bg-white focus:outline-none focus:ring-2 focus:ring-[#33599E]/20"
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
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-12 text-center text-[#64748B] space-y-3">
                <div className="w-8 h-8 border-3 border-[#33599E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold">Loading listing moderation queue…</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-bold">Error loading review queue</p>
                <p className="text-xs">{error}</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-[#64748B]">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-base font-bold text-[#000000]">Queue is Clear</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  {activeTab === 'pending'
                    ? 'There are currently no listings or proposals awaiting administrative review.'
                    : 'No moderation records found matching the selected filters.'}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-[#F1F5F9]">
                  {filteredReviews.map((rev) => {
                    const isPending = rev.status === 'PENDING';
                    const isInitial = rev.submissionType === 'INITIAL_PUBLISH';
                    const prop = rev.property;

                    return (
                      <div
                        key={rev.id}
                        className="p-4 md:p-5 hover:bg-[#F8FAFD] transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-start gap-3.5">
                          {/* Property Cover / Thumbnail */}
                          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-[#CBD5E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {prop?.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prop.coverImage}
                                alt={prop.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-[#94A3B8]" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Submission Type Badge */}
                              <span
                                className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isInitial
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}
                              >
                                {isInitial ? 'Initial Publication' : 'Important Edit Proposal'}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  rev.status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : rev.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : rev.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}
                              >
                                {rev.status}
                              </span>

                              {prop?.adminHidden && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                                  ADMIN HOLD
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-[#000000] leading-snug">
                              {prop?.title || 'Untitled Property'}
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                              <span className="flex items-center gap-1 font-semibold text-[#000000]">
                                <MapPin className="w-3.5 h-3.5 text-[#33599E]" />
                                {prop?.city || 'Unknown City'}
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-[#000000]">
                                <User className="w-3.5 h-3.5 text-[#64748B]" />
                                Host: {rev.submittedByHost?.fullName || 'Host'} (
                                {rev.submittedByHost?.email || 'N/A'})
                              </span>

                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                                Submitted:{' '}
                                {new Date(rev.submittedAt || rev.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Rejection notice snippet if rejected */}
                            {rev.status === 'REJECTED' && rev.rejectionReason && (
                              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-1">
                                <strong>Rejection Reason:</strong> {rev.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-end lg:self-center">
                          <button
                            onClick={() => openReviewDetail(rev.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#000000] hover:bg-[#E3EAF5]/50 transition shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#33599E]" /> Inspect & Decide
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(rev.id)}
                                disabled={actionInProgress === rev.id}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedReviewId(rev.id);
                                  setRejectionModalOpen(true);
                                }}
                                disabled={actionInProgress === rev.id}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
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
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <div>
                  <h2 className="text-lg font-black text-[#000000]">
                    Emergency Takedown & Safety Hold Console
                  </h2>
                  <p className="text-xs text-[#64748B]">
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
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20"
                />
                <button
                  type="button"
                  onClick={handleLookupListing}
                  disabled={takedownLoading || !takedownPropertyId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#33599E] hover:bg-[#234079] text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Lookup
                </button>
              </div>

              {/* Takedown Status messages */}
              {takedownMessage && (
                <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  {takedownMessage}
                </div>
              )}
              {takedownError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  {takedownError}
                </div>
              )}

              {/* Takedown Listing Result Card */}
              {takedownListing && (
                <div className="bg-[#F8FAFD] border border-[#CBD5E1] rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Listing ID: {takedownListing.id}
                      </span>
                      <h3 className="text-base font-black text-[#000000] mt-0.5">
                        {takedownListing.title}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {takedownListing.address}, {takedownListing.city} • Status:{' '}
                        <strong className="text-[#000000]">{takedownListing.status}</strong>
                      </p>
                    </div>

                    <div>
                      {takedownListing.adminHidden ? (
                        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          ADMIN HOLD ACTIVE
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          PUBLIC / ACCESSIBLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If currently hidden */}
                  {takedownListing.adminHidden ? (
                    <div className="space-y-3 pt-3 border-t border-[#CBD5E1]/60">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4 text-red-600" /> Administrative Hold
                          Details:
                        </p>
                        <p>
                          <strong>Reason:</strong> {takedownListing.adminHiddenReason || 'No reason specified'}
                        </p>
                        {takedownListing.adminHiddenAt && (
                          <p className="text-red-700">
                            <strong>Date Enforced:</strong>{' '}
                            {new Date(takedownListing.adminHiddenAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={handleRestoreListing}
                        disabled={takedownLoading}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Restore Listing to Public
                      </button>
                    </div>
                  ) : (
                    /* If active, allow takedown */
                    <div className="space-y-3 pt-3 border-t border-[#CBD5E1]/60">
                      <label className="block text-xs font-bold text-[#000000]">
                        Mandatory Reason for Administrative Hold <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={takedownReason}
                        onChange={(e) => setTakedownReason(e.target.value)}
                        placeholder="Explain specifically why this listing is being pulled down (e.g. Host identity fraud investigation, Safety hazard reported by guest, Unverified ownership)..."
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        onClick={handleHideListing}
                        disabled={takedownLoading || !takedownReason.trim()}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
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

        {/* ── MODAL: Side-by-Side Review & Diff Inspection ── */}
        {selectedReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#CBD5E1]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#CBD5E1] flex items-center justify-between bg-[#F8FAFD]">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-[#E3EAF5] text-[#33599E]">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-[#000000]">
                      Review Listing Submission
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {reviewDetail?.review?.submissionType === 'INITIAL_PUBLISH'
                        ? 'New Listing Publication Approval'
                        : 'Proposed Edits vs. Approved Live Version'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeReviewDetail}
                  className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#000000] hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {loadingDetail ? (
                  <div className="py-16 text-center text-[#64748B] space-y-3">
                    <div className="w-8 h-8 border-3 border-[#33599E] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold">Loading inspection diff…</p>
                  </div>
                ) : detailError ? (
                  <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                    {detailError}
                  </div>
                ) : reviewDetail ? (
                  <>
                    {/* Basic Property Header */}
                    <div className="bg-[#F8FAFD] border border-[#CBD5E1] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#64748B] uppercase">
                            Property:
                          </span>
                          <span className="text-sm font-black text-[#000000]">
                            {reviewDetail.property?.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {reviewDetail.property?.address}, {reviewDetail.property?.city} •{' '}
                          {reviewDetail.property?.propertyType}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#64748B] block">Current Status:</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase">
                          {reviewDetail.property?.status}
                        </span>
                      </div>
                    </div>

                    {/* Scenario A: IMPORTANT EDIT DIFF VIEW */}
                    {reviewDetail.review.submissionType === 'IMPORTANT_EDIT' && (
                      <div className="space-y-4">
                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900 leading-relaxed">
                          <span className="font-bold">Important Changes Proposed:</span> The table
                          below contrasts the currently live, bookable version of this listing against
                          the changes submitted by the host. The approved public version remains
                          unchanged until you click <strong>Approve</strong>.
                        </div>

                        {reviewDetail.diff && Object.keys(reviewDetail.diff).length > 0 ? (
                          <div className="border border-[#CBD5E1] rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-[#F1F5F9] font-black text-[#000000] border-b border-[#CBD5E1]">
                                <tr>
                                  <th className="p-3 w-1/4">Field</th>
                                  <th className="p-3 w-3/8 text-slate-600">Current Live Value</th>
                                  <th className="p-3 w-3/8 text-green-700">Proposed New Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#CBD5E1]/60 font-medium">
                                {Object.entries(reviewDetail.diff).map(([key, item]) => {
                                  const isDifferent =
                                    JSON.stringify(item.current) !== JSON.stringify(item.proposed);

                                  return (
                                    <tr
                                      key={key}
                                      className={isDifferent ? 'bg-amber-50/50' : 'bg-white'}
                                    >
                                      <td className="p-3 font-bold text-[#000000] capitalize">
                                        {key.replace(/([A-Z])/g, ' $1')}
                                      </td>
                                      <td className="p-3 text-slate-600 font-mono text-[11px] break-all">
                                        {Array.isArray(item.current)
                                          ? `[${item.current.length} items]`
                                          : String(item.current ?? '—')}
                                      </td>
                                      <td className="p-3 text-green-700 font-bold font-mono text-[11px] break-all bg-green-50/40">
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
                          <p className="text-xs text-[#64748B]">No specific field diffs detected.</p>
                        )}
                      </div>
                    )}

                    {/* Scenario B: INITIAL PUBLISH REVIEW */}
                    {reviewDetail.review.submissionType === 'INITIAL_PUBLISH' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                          <span className="font-bold">Initial Publication Quality Check:</span> Verify
                          that this property meets ENGIDA listing standards before making it
                          publicly searchable.
                        </div>

                        {/* Property summary grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#CBD5E1]">
                            <span className="text-[#64748B] font-bold block">Nightly / Sale Price:</span>
                            <span className="text-sm font-black text-[#000000]">
                              {reviewDetail.property?.pricePerNight
                                ? `${reviewDetail.property.pricePerNight} ETB / night`
                                : `${reviewDetail.property?.salePrice || 0} ETB`}
                            </span>
                          </div>

                          <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#CBD5E1]">
                            <span className="text-[#64748B] font-bold block">Capacity & Rooms:</span>
                            <span className="text-sm font-black text-[#000000]">
                              {reviewDetail.property?.maxGuests || 2} Guests •{' '}
                              {reviewDetail.property?.bedrooms || 1} Beds
                            </span>
                          </div>

                          <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#CBD5E1]">
                            <span className="text-[#64748B] font-bold block">Property Type:</span>
                            <span className="text-sm font-black text-[#000000]">
                              {reviewDetail.property?.propertyType}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="p-4 bg-white rounded-xl border border-[#CBD5E1] space-y-1">
                          <span className="text-xs font-bold text-[#000000] block">
                            Description:
                          </span>
                          <p className="text-xs text-[#64748B] leading-relaxed whitespace-pre-line">
                            {reviewDetail.property?.description}
                          </p>
                        </div>

                        {/* Images preview */}
                        {Array.isArray(reviewDetail.property?.images) &&
                          reviewDetail.property.images.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-[#000000] block">
                                Property Photos ({reviewDetail.property.images.length}):
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {reviewDetail.property.images.map((img: string, i: number) => (
                                  <div
                                    key={i}
                                    className="h-24 rounded-lg bg-slate-100 border border-[#CBD5E1] overflow-hidden"
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
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                        <label className="block text-xs font-bold text-red-900">
                          Mandatory Rejection Explanation <span className="text-red-600">*</span>
                        </label>
                        <p className="text-xs text-red-700">
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
                          className="w-full px-3 py-2 rounded-xl border border-red-300 text-xs font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                        />
                        {rejectionError && (
                          <p className="text-xs font-bold text-red-600">{rejectionError}</p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectionModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#000000] bg-white hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectSubmit}
                            disabled={actionInProgress !== null}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
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
              <div className="px-6 py-4 border-t border-[#CBD5E1] bg-[#F8FAFD] flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeReviewDetail}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#000000] hover:bg-white transition"
                >
                  Close
                </button>

                {reviewDetail?.review?.status === 'PENDING' && !rejectionModalOpen && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectionModalOpen(true)}
                      disabled={actionInProgress !== null}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject with Reason…
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(selectedReviewId)}
                      disabled={actionInProgress !== null}
                      className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Publish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
