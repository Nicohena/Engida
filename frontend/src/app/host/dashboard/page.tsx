'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import type { HostDashboardSummary, HostListingRow, HostListingsResponse, HostReservationRow, HostReservationsResponse } from '../../../types/host';
import {
  Building2,
  TrendingUp,
  CalendarCheck,
  Clock,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  PauseCircle,
  FileEdit,
  XCircle,
  BadgeDollarSign,
  Home,
  Tag,
  Sparkles,
  MapPin,
  CalendarRange,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Plus,
  Users,
  Eye,
  Sliders,
  ChevronRight,
} from 'lucide-react';

function formatETB(value: number): string {
  if (value === 0) return 'ETB 0';
  if (value >= 1_000_000) return `ETB ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `ETB ${(value / 1_000).toFixed(1)}K`;
  return `ETB ${value.toLocaleString()}`;
}

function formatUSD(etbValue: number): string {
  const usd = etbValue / 125;
  if (usd === 0) return '$0 USD';
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M USD`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K USD`;
  return `$${usd.toFixed(0)} USD`;
}

export default function HostDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<HostDashboardSummary | null>(null);
  const [recentListings, setRecentListings] = useState<HostListingRow[]>([]);
  const [recentReservations, setRecentReservations] = useState<HostReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, listingsData, reservationsData] = await Promise.all([
        apiFetch<HostDashboardSummary>('/host/dashboard'),
        apiFetch<HostListingsResponse>('/host/listings?limit=6').catch(() => ({ data: [], total: 0, page: 1, limit: 6, totalPages: 0 })),
        apiFetch<HostReservationsResponse>('/host/reservations?limit=4').catch(() => ({ data: [], total: 0, page: 1, limit: 4, totalPages: 0 })),
      ]);

      setSummary(summaryData);
      setRecentListings(listingsData.data || []);
      setRecentReservations(reservationsData.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load host dashboard. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="bg-white border border-red-200 rounded-3xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Could not load Host Dashboard</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-sm font-bold px-6 py-3 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Dashboard Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-slate-200" />
      </div>
    );
  }

  const hostDisplayName = user?.hostProfile?.displayName || user?.name || 'Host Partner';
  const totalListings = summary?.totalListings || 0;
  const publishedListings = summary?.publishedListings || 0;
  const totalBookingValue = summary?.totalBookingValue || 0;
  const pendingReservations = summary?.pendingReservations || 0;
  const confirmedReservations = summary?.confirmedReservations || 0;
  const upcomingReservations = summary?.upcomingReservations || 0;

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      
      {/* ── 1. EXECUTIVE COMMAND HERO BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e3a8a] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Host Executive Suite
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Partner
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-300 border border-white/10">
                🇪🇹 Ethiopia Marketplace
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Welcome back, {hostDisplayName}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Manage your active portfolio across Addis Ababa and Ethiopian regional centers. Track traveler bookings, monitor occupancy, and oversee financial settlements.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/host/listings/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-sm font-black px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Property</span>
            </Link>

            <Link
              href="/host/availability"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm font-bold px-4 py-3 rounded-2xl backdrop-blur-xs transition cursor-pointer"
            >
              <CalendarRange className="w-4 h-4 text-blue-300" />
              <span>Calendar & Rates</span>
            </Link>

            <Link
              href="/dashboard?view=guest"
              className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm font-semibold px-4 py-3 rounded-2xl transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Guest Mode</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. HERO KPI METRIC CARDS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Key performance indicators">
        
        {/* KPI 1: Active Portfolio */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              100% Active
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Properties
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {totalListings}
            </span>
            <span className="text-xs font-semibold text-slate-500">units online</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{summary?.rentalListings || 0} Rentals / Stays</span>
            <span>{summary?.saleListings || 0} For Sale</span>
          </div>
        </div>

        {/* KPI 2: Gross Booking Value */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BadgeDollarSign className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Escrow Protected
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Booking Volume
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {formatETB(totalBookingValue)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Approx. {formatUSD(totalBookingValue)}</span>
            <span className="text-emerald-600 font-bold">Chapa & CBE Direct</span>
          </div>
        </div>

        {/* KPI 3: Reservations Pipeline */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <Link
              href="/host/reservations"
              className="text-[11px] font-black uppercase tracking-wider text-[#1e40af] hover:underline"
            >
              View All →
            </Link>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Reservations
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {pendingReservations + confirmedReservations}
            </span>
            <span className="text-xs font-semibold text-slate-500">active stays</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="text-amber-700 font-bold">{pendingReservations} Pending Approval</span>
            <span className="text-emerald-700 font-bold">{confirmedReservations} Confirmed</span>
          </div>
        </div>

        {/* KPI 4: Market Demand Index */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              High Demand
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Market Demand Level
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              Peak Season
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Bole, Ayat, Kuriftu, Bahir Dar</span>
            <span className="text-indigo-600 font-bold">Active Search</span>
          </div>
        </div>

      </section>

      {/* ── 3. HOST PROPERTY PORTFOLIO SHOWCASE ── */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Live Property Portfolio
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Properties published under your host account across Ethiopian cities. Available for instant booking and buyer inquiry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/host/listings"
              className="inline-flex items-center gap-2 text-xs font-black text-[#1e40af] hover:text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition"
            >
              <span>View All {totalListings} Properties</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {recentListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentListings.map((property) => (
              <div
                key={property.id}
                className="group flex flex-col bg-slate-50/60 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Property Image & Status */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                  {property.coverImage ? (
                    <Image
                      src={property.coverImage}
                      alt={property.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Building2 className="w-12 h-12 stroke-[1.5]" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                      property.listingType === 'SALE'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1e40af] text-white'
                    }`}>
                      {property.listingType === 'SALE' ? 'For Sale' : 'Rental Stay'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/90 text-slate-800 shadow-xs backdrop-blur-xs">
                      {property.status}
                    </span>
                  </div>
                </div>

                {/* Property Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{property.city}{property.subCity ? `, ${property.subCity}` : ''}</span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base line-clamp-1 group-hover:text-[#1e40af] transition-colors">
                      {property.title}
                    </h3>

                    <div className="mt-3 flex items-baseline gap-1 text-slate-900">
                      <span className="text-lg font-black tabular-nums">
                        {property.listingType === 'SALE'
                          ? formatETB(Number(property.salePrice || 0))
                          : `${formatETB(Number(property.pricePerNight || 0))}`}
                      </span>
                      {property.listingType === 'RENTAL' && (
                        <span className="text-xs font-semibold text-slate-500">/ night</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold">
                    <Link
                      href={`/host/listings/${property.id}/edit`}
                      className="text-slate-700 hover:text-[#1e40af] flex items-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    {property.listingType === 'RENTAL' && (
                      <Link
                        href={`/host/availability?propertyId=${property.id}`}
                        className="text-slate-700 hover:text-[#1e40af] flex items-center gap-1"
                      >
                        <CalendarRange className="w-3.5 h-3.5" />
                        <span>Calendar</span>
                      </Link>
                    )}

                    <Link
                      href={`/properties/${property.id}`}
                      target="_blank"
                      className="text-[#1e40af] hover:text-[#1e3a8a] flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Public View</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No properties in this view</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first property listing to begin receiving reservation requests and inquiries.
            </p>
            <Link
              href="/host/listings/new"
              className="mt-4 inline-flex items-center gap-2 bg-[#1e40af] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Add Property
            </Link>
          </div>
        )}
      </section>

      {/* ── 4. RESERVATIONS PIPELINE & ETHIOPIAN SETTLEMENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Reservations Feed (2 cols) */}
        <section className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
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
              Manage All Bookings →
            </Link>
          </div>

          {recentReservations.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentReservations.map((reservation) => (
                <div key={reservation.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs uppercase shrink-0">
                      {reservation.guest?.name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {reservation.guest?.name || 'Guest Traveler'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservation.property?.title} • {reservation.checkInDate} to {reservation.checkOutDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-black text-slate-900 tabular-nums">
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
            <div className="py-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
              <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto mb-2.5" />
              <h3 className="text-sm font-black text-slate-800">
                All 24 Properties Are Live & Ready for Stays
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Your listings are published across Addis Ababa, Bahir Dar, Hawassa, and Bishoftu. When domestic travelers or international diaspora guests request a reservation, instant notifications and booking management actions will appear here.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2.5">
                <Link
                  href="/host/availability"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                  <span>Configure Calendar Blackouts</span>
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 border border-blue-200 text-[#1e40af] hover:bg-blue-100 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Public Marketplace</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Payout & Banking Settlement Card (1 col) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Financial Payouts
                </h3>
                <p className="text-xs text-slate-500">
                  Escrow settlement & disbursement
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Payout Provider:</span>
                <span className="font-bold text-slate-900">
                  {user?.hostProfile?.payoutProvider || 'Chapa & CBE Direct'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Beneficiary Name:</span>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">
                  {user?.hostProfile?.payoutAccountName || hostDisplayName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Account ID / IBAN:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {user?.hostProfile?.payoutAccountNumber || 'SUB_ACCT_HABTAMU_01'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Settlement Currency:</span>
                <span className="font-bold text-emerald-700">ETB (Ethiopian Birr)</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed bg-blue-50/60 border border-blue-100 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-[#1e40af] shrink-0 mt-0.5" />
              <span>
                Funds are secured via Engida Escrow and released automatically upon successful guest check-in.
              </span>
            </div>
          </div>

          <Link
            href="/host/profile"
            className="w-full text-center inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Banking & Payout Settings</span>
          </Link>
        </section>

      </div>

    </div>
  );
}
