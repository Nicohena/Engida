'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import type { HostDashboardSummary } from '../../../types/host';
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
  Archive,
  XCircle,
  BadgeDollarSign,
  Home,
  Tag,
} from 'lucide-react';

// ──────────────────────────────────────────────────
// Skeleton card — stable layout during loading
// ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#E3EAF5]" />
        <div className="h-4 w-24 rounded-md bg-[#E3EAF5]" />
      </div>
      <div className="h-8 w-16 rounded-md bg-[#E3EAF5] mb-1" />
      <div className="h-3 w-20 rounded-md bg-[#F4F7FC]" />
    </div>
  );
}

// ──────────────────────────────────────────────────
// Stat card component
// ──────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, subtitle }: StatCardProps) {
  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wide leading-tight">
          {label}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black text-[#000000] tabular-nums leading-none">{value}</p>
        {subtitle && (
          <p className="text-xs text-[#94A3B8] mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Section header
// ──────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-black text-[#94A3B8] uppercase tracking-widest mb-3">
      {title}
    </h2>
  );
}

// ──────────────────────────────────────────────────
// Format ETB (Ethiopian Birr)
// ──────────────────────────────────────────────────
function formatETB(value: number): string {
  if (value === 0) return 'ETB 0';
  if (value >= 1_000_000) return `ETB ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `ETB ${(value / 1_000).toFixed(1)}K`;
  return `ETB ${value.toLocaleString()}`;
}

// ──────────────────────────────────────────────────
// Empty state (new host with zero data)
// ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#E3EAF5] flex items-center justify-center mx-auto mb-5">
        <Building2 className="w-8 h-8 text-[#33599E]" />
      </div>
      <h3 className="text-lg font-black text-[#000000] mb-2">Welcome to your Host Portal</h3>
      <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
        You haven't listed any properties yet. Create your first listing to start
        attracting guests and buyers on Engida.
      </p>
      <Link
        href="/host/listings"
        className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-6 py-3 rounded-xl transition"
      >
        <Building2 className="w-4 h-4" />
        Create your first listing
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Dashboard page
// ──────────────────────────────────────────────────
export default function HostDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<HostDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HostDashboardSummary>('/host/dashboard');
      setSummary(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isNewHost = summary !== null && summary.totalListings === 0;

  // ─────────── Error state ───────────
  if (error) {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-md">
          <h1 className="text-2xl font-black text-[#000000] mb-6">Dashboard</h1>
          <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-[#000000] mb-2">Could not load dashboard</h3>
            <p className="text-sm text-[#64748B] mb-6">{error}</p>
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── Loading state ───────────
  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-8">
        {/* Page header skeleton */}
        <div>
          <div className="h-8 w-48 rounded-lg bg-[#E3EAF5] animate-pulse mb-2" />
          <div className="h-4 w-64 rounded-lg bg-[#F4F7FC] animate-pulse" />
        </div>
        {/* Listing summary skeletons */}
        <div>
          <div className="h-3 w-28 rounded bg-[#F4F7FC] animate-pulse mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
        {/* Reservation skeletons */}
        <div>
          <div className="h-3 w-28 rounded bg-[#F4F7FC] animate-pulse mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // ─────────── Empty state ───────────
  if (isNewHost) {
    return (
      <div className="p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[#000000] mb-1">
            Welcome, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-[#64748B]">
            Your host portal is ready — let's get your first listing live.
          </p>
        </div>
        <EmptyState />
      </div>
    );
  }

  // ─────────── Dashboard ───────────
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#000000] leading-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Your host activity at a glance
          </p>
        </div>
        <Link
          href="/host/listings"
          className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition flex-shrink-0"
        >
          <Building2 className="w-4 h-4" />
          My Listings
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── LISTINGS SUMMARY ── */}
      <section aria-label="Listings summary">
        <SectionHeader title="Listings" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Listings"
            value={summary!.totalListings}
            icon={Building2}
            iconBg="bg-[#E3EAF5]"
            iconColor="text-[#33599E]"
          />
          <StatCard
            label="Published"
            value={summary!.publishedListings}
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            subtitle="Live on Engida"
          />
          <StatCard
            label="Drafts"
            value={summary!.draftListings}
            icon={FileEdit}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            subtitle="Not yet published"
          />
          <StatCard
            label="Paused"
            value={summary!.pausedListings}
            icon={PauseCircle}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            subtitle="Temporarily hidden"
          />
        </div>
      </section>

      {/* ── LISTING TYPE SUMMARY ── */}
      <section aria-label="Listing types">
        <SectionHeader title="By Type" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Rental"
            value={summary!.rentalListings}
            icon={Home}
            iconBg="bg-[#E3EAF5]"
            iconColor="text-[#33599E]"
            subtitle="Short-term rentals"
          />
          <StatCard
            label="For Sale"
            value={summary!.saleListings}
            icon={Tag}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            subtitle="Sale listings"
          />
          {summary!.totalListings - summary!.publishedListings - summary!.draftListings - summary!.pausedListings > 0 && (
            <StatCard
              label="Archived / Sold"
              value={summary!.totalListings - summary!.publishedListings - summary!.draftListings - summary!.pausedListings}
              icon={Archive}
              iconBg="bg-slate-100"
              iconColor="text-slate-400"
            />
          )}
        </div>
      </section>

      {/* ── RESERVATION SUMMARY ── */}
      <section aria-label="Reservation summary">
        <SectionHeader title="Reservations" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending"
            value={summary!.pendingReservations}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            subtitle="Awaiting confirmation"
          />
          <StatCard
            label="Confirmed"
            value={summary!.confirmedReservations}
            icon={CalendarCheck}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            subtitle="Accepted bookings"
          />
          <StatCard
            label="Upcoming"
            value={summary!.upcomingReservations}
            icon={TrendingUp}
            iconBg="bg-[#E3EAF5]"
            iconColor="text-[#33599E]"
            subtitle="Check-in ≥ today"
          />
          <StatCard
            label="Completed"
            value={summary!.completedReservations}
            icon={CheckCircle2}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            subtitle="Finished stays"
          />
        </div>
      </section>

      {/* ── BOOKING VALUE SUMMARY ── */}
      <section aria-label="Booking value summary">
        <SectionHeader title="Booking Totals" />
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E3EAF5] flex items-center justify-center flex-shrink-0">
              <BadgeDollarSign className="w-6 h-6 text-[#33599E]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide mb-1">
                Total Booking Value
              </p>
              <p className="text-3xl font-black text-[#000000] tabular-nums leading-none mb-2">
                {formatETB(summary!.totalBookingValue)}
              </p>
              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm">
                Sum of confirmed and completed booking totals. This represents booking value only — 
                not actual settled or paid revenue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ── */}
      <section aria-label="Quick actions">
        <SectionHeader title="Quick Actions" />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-2 bg-white border border-[#CBD5E1] hover:border-[#33599E] hover:text-[#33599E] text-[#334155] text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Building2 className="w-4 h-4" />
            View All Listings
          </Link>
          <Link
            href="/host/reservations"
            className="inline-flex items-center gap-2 bg-white border border-[#CBD5E1] hover:border-[#33599E] hover:text-[#33599E] text-[#334155] text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <CalendarCheck className="w-4 h-4" />
            View Reservations
          </Link>
        </div>
      </section>

    </div>
  );
}
