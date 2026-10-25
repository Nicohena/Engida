'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import type {
  HostReviewsSummary,
  HostReviewsPage,
  HostReviewItem,
  PropertyReviewSummary,
} from '../../../types/host';
import {
  Star,
  MessageSquareQuote,
  Building2,
  Filter,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  ThumbsUp,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  if (!name) return 'VG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRatingDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {stars.map((s) => {
        const isFilled = rating >= s;
        const isHalf = !isFilled && rating >= s - 0.5;
        return (
          <span key={s} className="relative inline-block">
            <Star
              size={size}
              className={`${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                  ? 'fill-amber-200 text-amber-400'
                  : 'fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-700'
              } transition-colors`}
            />
          </span>
        );
      })}
    </div>
  );
}

export default function HostReviewsPage() {
  const { user, loading: authLoading } = useAuth();

  // Filters state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Data state
  const [summary, setSummary] = useState<HostReviewsSummary | null>(null);
  const [reviews, setReviews] = useState<HostReviewItem[]>([]);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Loading & error states
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load reviews and summary data
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;

    const loadData = async () => {
      queueMicrotask(() => {
        if (active) {
          setLoadingSummary(true);
          setLoadingReviews(true);
          setError(null);
        }
      });

      try {
        const summaryParams = new URLSearchParams();
        if (selectedPropertyId) summaryParams.set('propertyId', selectedPropertyId);
        const summaryQs = summaryParams.toString();
        const summaryUrl = `/host/reviews/summary${summaryQs ? `?${summaryQs}` : ''}`;

        const reviewsParams = new URLSearchParams();
        if (selectedPropertyId) reviewsParams.set('propertyId', selectedPropertyId);
        if (selectedRating !== null) reviewsParams.set('rating', String(selectedRating));
        reviewsParams.set('page', String(page));
        reviewsParams.set('limit', '10');

        const [summaryData, reviewsData] = await Promise.all([
          apiFetch<HostReviewsSummary>(summaryUrl),
          apiFetch<HostReviewsPage>(`/host/reviews?${reviewsParams.toString()}`),
        ]);

        if (active) {
          setSummary(summaryData);
          setReviews(reviewsData.data);
          setTotalReviews(reviewsData.total);
          setTotalPages(reviewsData.totalPages);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load reviews data';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoadingSummary(false);
          setLoadingReviews(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [authLoading, user, selectedPropertyId, selectedRating, page, refreshKey]);

  const handleResetFilters = () => {
    setSelectedPropertyId('');
    setSelectedRating(null);
    setPage(1);
  };

  const handleRatingFilter = (ratingVal: number | null) => {
    setSelectedRating(ratingVal);
    setPage(1);
  };

  const handlePropertyFilter = (propId: string) => {
    setSelectedPropertyId(propId);
    setPage(1);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm">Loading reputation data...</p>
        </div>
      </div>
    );
  }

  const overallAvg = summary?.averageRating ?? 0;
  const overallCount = summary?.totalReviews ?? 0;
  const fiveStarCount = summary?.ratingDistribution?.[5] ?? 0;
  const fiveStarPercent = overallCount > 0 ? Math.round((fiveStarCount / overallCount) * 100) : 0;

  // Active property summaries for dropdown and breakdown
  const propertyOptions: PropertyReviewSummary[] = summary?.propertySummaries ?? [];

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Guest Reviews & Reputation
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Monitor authentic guest feedback, track star rating trends, and maintain hospitality standards.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 p-4 text-rose-800 dark:text-rose-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Unable to load reviews data</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300/80">{error}</p>
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="rounded-lg bg-rose-100 dark:bg-rose-900/60 px-3 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Top Metrics & Star Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Rating KPI Card (5 cols on lg) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Overall Host Score
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Reviews
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              {loadingSummary ? (
                <div className="h-12 w-24 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ) : (
                <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {overallAvg > 0 ? overallAvg.toFixed(1) : '—'}
                </span>
              )}
              <div className="flex flex-col">
                <div className="flex items-center">
                  <StarRatingDisplay rating={overallAvg} size={20} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  out of 5.0 rating
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {overallCount === 0 ? (
                'No guest reviews received yet. Share your listings and complete stays to earn ratings.'
              ) : overallAvg >= 4.5 ? (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Exceptional hospitality! You meet premier host performance standards.
                </span>
              ) : overallAvg >= 4.0 ? (
                <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                  <ThumbsUp className="h-4 w-4 shrink-0" />
                  Strong performance across guest bookings.
                </span>
              ) : (
                'Focus on guest feedback to improve satisfaction and increase booking conversion.'
              )}
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Total Reviews</p>
              {loadingSummary ? (
                <div className="h-6 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {overallCount}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">5-Star Share</p>
              {loadingSummary ? (
                <div className="h-6 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {overallCount > 0 ? `${fiveStarPercent}%` : '0%'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rating Distribution Breakdown (7 cols on lg) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Rating Distribution
              </h2>
              {selectedRating !== null && (
                <button
                  onClick={() => handleRatingFilter(null)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Clear star filter
                </button>
              )}
            </div>

            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary?.ratingDistribution?.[stars as 1 | 2 | 3 | 4 | 5] ?? 0;
                const percent = overallCount > 0 ? Math.round((count / overallCount) * 100) : 0;
                const isSelected = selectedRating === stars;

                return (
                  <button
                    key={stars}
                    onClick={() => handleRatingFilter(isSelected ? null : stars)}
                    className={`w-full group flex items-center gap-3 p-1.5 -mx-1.5 rounded-xl transition-colors text-left ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300 dark:ring-amber-700/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-12 shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{stars}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </div>

                    <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stars >= 4
                            ? 'bg-amber-400 dark:bg-amber-400'
                            : stars === 3
                            ? 'bg-amber-300 dark:bg-amber-500/80'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="w-20 text-right shrink-0 flex items-center justify-end gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{count}</span>
                      <span className="text-[11px] text-slate-400">({percent}%)</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-right">
            Click on any star tier to filter the reviews list below.
          </p>
        </div>
      </div>

      {/* Property Summaries Cards (if host has multiple properties) */}
      {propertyOptions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Performance by Listing
              </h2>
            </div>
            {selectedPropertyId && (
              <button
                onClick={() => handlePropertyFilter('')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View all listings
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyOptions.map((prop) => {
              const isSelected = selectedPropertyId === prop.propertyId;
              return (
                <button
                  key={prop.propertyId}
                  onClick={() => handlePropertyFilter(isSelected ? '' : prop.propertyId)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                    {prop.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prop.coverImage}
                        alt={prop.propertyTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {prop.propertyTitle}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{prop.propertyCity}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {prop.reviewCount > 0 ? prop.averageRating.toFixed(1) : 'No rating'}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {prop.reviewCount} {prop.reviewCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Tab Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        {/* Star Rating Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => handleRatingFilter(null)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedRating === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Ratings ({overallCount})
          </button>
          {[5, 4, 3, 2, 1].map((s) => {
            const count = summary?.ratingDistribution?.[s as 1 | 2 | 3 | 4 | 5] ?? 0;
            const isSelected = selectedRating === s;
            return (
              <button
                key={s}
                onClick={() => handleRatingFilter(isSelected ? null : s)}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{s}</span>
                <Star className={`h-3 w-3 ${isSelected ? 'fill-slate-900 text-slate-900' : 'fill-amber-400 text-amber-400'}`} />
                <span className="text-[11px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Property Selector & Reset */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-64">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              aria-label="Filter by property"
              value={selectedPropertyId}
              onChange={(e) => handlePropertyFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Properties ({propertyOptions.length})</option>
              {propertyOptions.map((p) => (
                <option key={p.propertyId} value={p.propertyId}>
                  {p.propertyTitle} ({p.reviewCount} reviews)
                </option>
              ))}
            </select>
          </div>

          {(selectedPropertyId || selectedRating !== null) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Reviews Content List */}
      <div className="space-y-4">
        {loadingReviews ? (
          /* Loading Skeletons */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400 dark:text-slate-500">
              <MessageSquareQuote className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No reviews match criteria
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {selectedRating !== null || selectedPropertyId
                ? 'No reviews found for the selected star rating or property. Try resetting your filters.'
                : 'You have not received any guest reviews yet. Completed reservations will invite guests to leave reviews.'}
            </p>
            {(selectedRating !== null || selectedPropertyId) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          /* Review Cards */
          reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Review Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {getInitials(r.guestName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {r.guestName}
                      </p>
                      <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        Verified Guest
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <StarRatingDisplay rating={r.rating} size={16} />
                  <span className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                    {r.rating}.0
                  </span>
                </div>
              </div>

              {/* Property link badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {r.propertyTitle}
                </span>
                {r.propertyCity && (
                  <span className="text-slate-400">• {r.propertyCity}</span>
                )}
              </div>

              {/* Review Text */}
              <div className="mt-4">
                {r.comment ? (
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                    {r.comment}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400">
                    Guest submitted a star rating without written comments.
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {!loadingReviews && reviews.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalReviews} total reviews)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trust & Transparency Footnote */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 p-4 text-xs text-slate-400 flex items-center justify-between">
        <span>
          Reviews are submitted by guests with verified completed reservations on ENGIDA. Hosts cannot edit, delete, or alter ratings.
        </span>
        <Link
          href="/terms"
          className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
        >
          Review Policy
        </Link>
      </div>
    </div>
  );
}
