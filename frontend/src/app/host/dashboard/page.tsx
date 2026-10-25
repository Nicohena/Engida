'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import type {
  HostDashboardSummary,
  HostListingRow,
  HostListingsResponse,
  HostReservationRow,
  HostReservationsResponse,
  HostProfile,
  HostVerificationStatus,
} from '../../../types/host';
import {
  Building2,
  TrendingUp,
  CalendarCheck,
  RotateCcw,
  FileEdit,
  XCircle,
  BadgeDollarSign,
  MapPin,
  CalendarRange,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  BadgeCheck,
  Plus,
  Eye,
  Sliders,
  ChevronRight,
  BedDouble,
  Bath,
} from 'lucide-react';

function formatETB(value: number): string {
  if (value === 0) return 'ETB 0';
  if (value >= 1_000_000) return `ETB ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `ETB ${(value / 1_000).toFixed(1)}K`;
  return `ETB ${value.toLocaleString()}`;
}

export default function HostDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<HostDashboardSummary | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [recentListings, setRecentListings] = useState<HostListingRow[]>([]);
  const [recentReservations, setRecentReservations] = useState<HostReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;

    const loadDashboardData = async () => {
      try {
        const [summaryData, listingsData, reservationsData, profileData] = await Promise.all([
          apiFetch<HostDashboardSummary>('/host/dashboard'),
          apiFetch<HostListingsResponse>('/host/listings?limit=6').catch(() => ({ data: [], total: 0, page: 1, limit: 6, totalPages: 0 })),
          apiFetch<HostReservationsResponse>('/host/reservations?limit=4').catch(() => ({ data: [], total: 0, page: 1, limit: 4, totalPages: 0 })),
          apiFetch<HostProfile>('/host/profile').catch(() => null),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setRecentListings(listingsData.data || []);
        setRecentReservations(reservationsData.data || []);
        if (profileData) {
          setHostProfile(profileData);
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load host dashboard. Please try again.');
        }
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

    void loadDashboardData();

    return () => {
      active = false;
    };
  }, [authLoading, user, refreshKey]);

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Could not load Host Dashboard</h2>
          <p className="text-xs text-slate-600 mb-5 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-16 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const hostDisplayName = hostProfile?.displayName || user?.hostProfile?.displayName || user?.name || 'Host Partner';
  const totalListings = summary?.totalListings || 0;
  const totalBookingValue = summary?.totalBookingValue || 0;
  const pendingReservations = summary?.pendingReservations || 0;
  const confirmedReservations = summary?.confirmedReservations || 0;

  const verificationStatus: HostVerificationStatus =
    hostProfile?.verificationStatus ||
    user?.hostProfile?.verificationStatus ||
    'UNVERIFIED';

  const rejectionReason: string | null =
    hostProfile?.rejectionReason ||
    user?.hostProfile?.rejectionReason ||
    null;

  const renderStatusBadge = () => {
    switch (verificationStatus) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verified Host
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1e40af] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Verification Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Verification Rejected
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Verification Required
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      
      {/* ── 1. CLEAN NATIVE SAAS HEADER ── */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-2">
        {/* Left: Title & Host Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Host Dashboard
            </h1>
            {renderStatusBadge()}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Welcome back, <span className="font-semibold text-slate-700">{hostDisplayName}</span> • Managing {totalListings} active properties across Ethiopia
          </p>
        </div>

        {/* Right: Clean Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-1.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Property</span>
          </Link>

          <Link
            href="/host/availability"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-2xs hover:border-slate-300 transition cursor-pointer"
          >
            <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
            <span>Calendar & Rates</span>
          </Link>

          <Link
            href="/dashboard?view=guest"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/90 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl shadow-2xs hover:border-slate-300 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Guest Mode</span>
          </Link>
        </div>
      </section>

      {/* ── VERIFICATION ACTION BANNER ── */}
      {verificationStatus === 'UNVERIFIED' && (
        <section
          role="region"
          aria-label="Verification status banner"
          className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-amber-950">
                Identity Verification Required
              </h2>
              <p className="text-xs text-amber-800 max-w-2xl leading-relaxed">
                Your host profile has not been submitted for verification. While you can create and manage draft listings, properties require verified host status before moderation approval and public discovery.
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <Link
              href="/host/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Complete &amp; Submit Verification</span>
            </Link>
          </div>
        </section>
      )}

      {verificationStatus === 'PENDING' && (
        <section
          role="region"
          aria-label="Verification status banner"
          className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/90 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1e40af] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
              <Clock className="w-5 h-5 text-blue-700 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-blue-950">
                Verification Request Awaiting Review
              </h2>
              <p className="text-xs text-blue-800 max-w-2xl leading-relaxed">
                Your verification submission is currently being reviewed by the ENGIDA compliance team. You can continue creating properties, setting rates, and blocking dates while your review is processed.
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <Link
              href="/host/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-[#1e40af] hover:bg-blue-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <span>View Profile Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {verificationStatus === 'REJECTED' && (
        <section
          role="region"
          aria-label="Verification status banner"
          className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/90 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-start gap-3.5 flex-1">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-sm font-bold text-rose-950">
                Verification Request Was Not Approved
              </h2>
              <p className="text-xs text-rose-800 max-w-2xl leading-relaxed">
                Your previous identity verification submission could not be approved. Please review the compliance feedback below, update your details, and resubmit for review.
              </p>
              {rejectionReason && (
                <div className="p-3 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-950 max-w-2xl">
                  <span className="font-bold">Compliance Feedback: </span>
                  <span className="font-medium text-slate-800">{rejectionReason}</span>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <Link
              href="/host/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Correct Details &amp; Resubmit</span>
            </Link>
          </div>
        </section>
      )}

      {verificationStatus === 'VERIFIED' && (
        <section
          role="region"
          aria-label="Verification status banner"
          className="p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-900 flex items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-emerald-950">
                Verified Host Partner
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-800">
                Your identity has been verified. Your published listings proudly display the Verified Host trust badge.
              </p>
            </div>
          </div>
          <Link
            href="/host/profile"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline shrink-0 hidden sm:inline-flex items-center gap-1"
          >
            <span>Account Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* ── 2. RESTRUCTURED 4-COLUMN METRIC CARDS ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5" aria-label="Key performance indicators">
        
        {/* KPI 1: Active Portfolio */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              100% Active
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Properties
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {totalListings}
            </span>
            <span className="text-xs text-slate-500 font-medium">units online</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
            {summary?.rentalListings || 0} Rentals • {summary?.saleListings || 0} For Sale
          </p>
        </div>

        {/* KPI 2: Gross Booking Value */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BadgeDollarSign className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Escrow Protected
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gross Booking Value
          </p>
          <div className="mt-1 flex items-baseline">
            <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatETB(totalBookingValue)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
            Direct Chapa & CBE Settlement
          </p>
        </div>

        {/* KPI 3: Reservations Pipeline */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <Link
              href="/host/reservations"
              className="text-xs font-bold text-[#1e40af] hover:underline"
            >
              View All →
            </Link>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Reservations
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {pendingReservations + confirmedReservations}
            </span>
            <span className="text-xs text-slate-500 font-medium">active stays</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
            {pendingReservations} Pending Approval • {confirmedReservations} Confirmed
          </p>
        </div>

        {/* KPI 4: Market Demand Level */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              High Demand
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Market Demand Level
          </p>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Peak Season
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
            Addis Ababa, Kuriftu & Lake Tana
          </p>
        </div>

      </section>

      {/* ── 3. LIVE PROPERTY PORTFOLIO SHOWCASE (CLEANED HIERARCHY) ── */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Live Property Portfolio
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Properties published under your host account across Ethiopian sites. Available for instant booking and buyer inquiry.
            </p>
          </div>

          <Link
            href="/host/listings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e40af] hover:text-[#1e3a8a] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/60 px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
          >
            <span>View All {totalListings} Properties</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentListings.map((property) => (
              <div
                key={property.id}
                className="group flex flex-col bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all duration-200"
              >
                {/* Property Cover Image with Clean Floating Badges */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                  {property.coverImage ? (
                    <Image
                      src={property.coverImage}
                      alt={property.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Building2 className="w-10 h-10 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                      property.listingType === 'SALE'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1e40af] text-white'
                    }`}>
                      {property.listingType === 'SALE' ? 'For Sale' : 'Rental'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-emerald-800 shadow-xs backdrop-blur-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {property.status}
                    </span>
                  </div>
                </div>

                {/* Property Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{property.city}{property.subCity ? `, ${property.subCity}` : ''}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-[#1e40af] transition-colors" title={property.title}>
                      {property.title}
                    </h3>

                    {/* Bedrooms / Specs */}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                      {property.bedrooms !== undefined && property.bedrooms !== null && (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                          <span>{property.bedrooms} Beds</span>
                        </span>
                      )}
                      {property.bathrooms !== undefined && property.bathrooms !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{property.bathrooms} Baths</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1 text-slate-900">
                      <span className="text-base font-bold tabular-nums">
                        {property.listingType === 'SALE'
                          ? formatETB(Number(property.salePrice || 0))
                          : formatETB(Number(property.pricePerNight || 0))}
                      </span>
                      {property.listingType === 'RENTAL' && (
                        <span className="text-[11px] font-normal text-slate-500">/ night</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <Link
                      href={`/host/listings/${property.id}/edit`}
                      className="text-slate-600 hover:text-[#1e40af] flex items-center gap-1 transition"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    {property.listingType === 'RENTAL' && (
                      <Link
                        href={`/host/availability?propertyId=${property.id}`}
                        className="text-slate-600 hover:text-[#1e40af] flex items-center gap-1 transition"
                      >
                        <CalendarRange className="w-3.5 h-3.5" />
                        <span>Calendar</span>
                      </Link>
                    )}

                    <Link
                      href={`/properties/${property.id}`}
                      target="_blank"
                      className="text-[#1e40af] hover:text-[#1e3a8a] flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Live View</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No properties available</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first property listing to begin receiving reservation requests.
            </p>
            <Link
              href="/host/listings/new"
              className="mt-3 inline-flex items-center gap-1.5 bg-[#1e40af] text-white text-xs font-bold px-3.5 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Add Property
            </Link>
          </div>
        )}
      </section>

      {/* ── 4. RESERVATIONS PIPELINE & ETHIOPIAN FINANCIAL SETTLEMENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Recent Reservations Feed (2 cols) */}
        <section className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Guest Reservations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Incoming booking requests and confirmed traveler stays.
              </p>
            </div>
            <Link
              href="/host/reservations"
              className="text-xs font-bold text-[#1e40af] hover:underline"
            >
              Manage Bookings →
            </Link>
          </div>

          {recentReservations.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentReservations.map((reservation) => (
                <div key={reservation.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {reservation.guest?.name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {reservation.guest?.name || 'Guest Traveler'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {reservation.property?.title} • {reservation.checkInDate} to {reservation.checkOutDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatETB(reservation.totalPrice)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      reservation.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : reservation.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-5">
              <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-800">
                All {totalListings} Properties Are Live & Ready for Stays
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Your listings are published across Addis Ababa, Bahir Dar, Hawassa, and Bishoftu. When domestic travelers or international diaspora guests request a reservation, instant notifications and booking actions will appear here.
              </p>
              <div className="mt-3.5 flex items-center justify-center gap-2">
                <Link
                  href="/host/availability"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  <CalendarRange className="w-3 h-3 text-blue-600" />
                  <span>Calendar Blackouts</span>
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 border border-blue-200 text-[#1e40af] hover:bg-blue-100 transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>Marketplace</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Payout & Banking Settlement Card (1 col) */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Financial Payouts
                </h3>
                <p className="text-[11px] text-slate-500">
                  Escrow settlement & disbursement
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Provider:</span>
                <span className="font-bold text-slate-900">
                  {user?.hostProfile?.payoutProvider || 'Chapa & CBE Direct'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Beneficiary:</span>
                <span className="font-bold text-slate-900 truncate max-w-[140px]">
                  {user?.hostProfile?.payoutAccountName || hostDisplayName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Account ID:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {user?.hostProfile?.payoutAccountNumber || 'SUB_ACCT_HABTAMU_01'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Currency:</span>
                <span className="font-bold text-emerald-700">ETB (Ethiopian Birr)</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed bg-blue-50/50 border border-blue-100 rounded-xl p-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1e40af] shrink-0 mt-0.5" />
              <span>
                Funds are protected in escrow and disbursed upon guest check-in.
              </span>
            </div>
          </div>

          <Link
            href="/host/profile"
            className="w-full text-center inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Banking & Payouts</span>
          </Link>
        </section>

      </div>

    </div>
  );
}
