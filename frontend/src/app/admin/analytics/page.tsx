'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Compass,
  Download,
  Flame,
  Globe2,
  Home,
  Layers,
  LineChart,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  AnalyticsKpi,
  AnalyticsOverviewResult,
  AnalyticsPeriod,
  CategoryMetric,
  DestinationMetric,
  StatusFunnelItem,
  TimeSeriesPoint,
} from '../../../types/admin-system';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  ytd: 'Year to Date',
  '1y': 'Past 12 Months',
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [data, setData] = useState<AnalyticsOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TimeSeriesPoint | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchOverview = useCallback(async (selectedPeriod: AnalyticsPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AnalyticsOverviewResult>(
        `/admin/analytics/overview?period=${selectedPeriod}`,
      );
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load business analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(period);
  }, [fetchOverview, period]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/admin/analytics/export?period=${period}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) throw new Error('Failed to download report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `engida-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Could not export CSV');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `ETB ${val.toLocaleString('en-US')}`;
  };

  // SVG Chart Dimensions & Computations
  const timeSeries = data?.timeSeries || [];
  const maxGbv = Math.max(...timeSeries.map((p) => p.gbvEtb), 1000);
  const chartHeight = 220;
  const chartWidth = 760;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const pointsGbv = timeSeries.map((p, i) => {
    const x = paddingX + (i / Math.max(timeSeries.length - 1, 1)) * plotWidth;
    const y = chartHeight - paddingY - (p.gbvEtb / maxGbv) * plotHeight;
    return { x, y, point: p };
  });

  const pointsRev = timeSeries.map((p, i) => {
    const x = paddingX + (i / Math.max(timeSeries.length - 1, 1)) * plotWidth;
    const y = chartHeight - paddingY - (p.revenueEtb / maxGbv) * plotHeight;
    return { x, y, point: p };
  });

  const pathGbv =
    pointsGbv.length > 0
      ? `M ${pointsGbv[0].x} ${pointsGbv[0].y} ` +
        pointsGbv.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(' ')
      : '';

  const pathRev =
    pointsRev.length > 0
      ? `M ${pointsRev[0].x} ${pointsRev[0].y} ` +
        pointsRev.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(' ')
      : '';

  const areaGbv =
    pointsGbv.length > 0
      ? `${pathGbv} L ${pointsGbv[pointsGbv.length - 1].x} ${chartHeight - paddingY} L ${pointsGbv[0].x} ${chartHeight - paddingY} Z`
      : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Business Intelligence & Analytics"
        description="Comprehensive platform metrics, reservation flow, marketplace take-rate, and regional performance hubs."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector Tabs */}
            <div className="flex items-center rounded-xl border border-[#d8d0c8] bg-[#f2ece4] p-1 shadow-sm">
              {(['7d', '30d', '90d', 'ytd', '1y'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                    period === p
                      ? 'bg-[#b3541e] text-white shadow-sm'
                      : 'text-[#605850] hover:text-[#3a302a]'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8d0c8] bg-white px-3.5 py-2 text-xs font-semibold text-[#3a302a] shadow-sm transition hover:bg-[#eae2da] disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5 text-[#b3541e]" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <button
              type="button"
              onClick={() => fetchOverview(period)}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white text-[#605850] shadow-sm transition hover:bg-[#eae2da] hover:text-[#3a302a]"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#b3541e]' : ''}`} />
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Booking Value */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white p-5 shadow-[0_12px_24px_-18px_rgba(58,48,42,0.15)] transition-all hover:border-[#b3541e]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78706a]">
              Gross Booking Value
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f0e8] text-[#b3541e]">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold tracking-tight text-[#3a302a]">
              {data ? formatCurrency(data.kpis.grossBookingValueEtb) : '—'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
            {data && data.kpis.growth.gbvPercent >= 0 ? (
              <>
                <span className="inline-flex items-center text-emerald-700">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  +{data.kpis.growth.gbvPercent}%
                </span>
                <span className="text-[#78706a]">vs previous period</span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center text-[#8c3c3c]">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {data?.kpis.growth.gbvPercent}%
                </span>
                <span className="text-[#78706a]">vs previous period</span>
              </>
            )}
          </div>
        </div>

        {/* Net Platform Take-rate Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white p-5 shadow-[0_12px_24px_-18px_rgba(58,48,42,0.15)] transition-all hover:border-[#b3541e]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78706a]">
              Net Revenue (12%)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f0e8] text-[#b3541e]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold tracking-tight text-[#b3541e]">
              {data ? formatCurrency(data.kpis.netRevenueEtb) : '—'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-[#605850]">
              Disbursed payouts: {data ? formatCurrency(data.kpis.hostPayoutsEtb) : '—'}
            </span>
          </div>
        </div>

        {/* Booking Volume & Conversion */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white p-5 shadow-[0_12px_24px_-18px_rgba(58,48,42,0.15)] transition-all hover:border-[#b3541e]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78706a]">
              Reservations
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f0e8] text-[#b3541e]">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold tracking-tight text-[#3a302a]">
              {data ? data.kpis.totalBookings : '—'}
            </span>
            <span className="text-xs font-semibold text-[#78706a]">
              ({data ? data.kpis.confirmedBookings : 0} confirmed)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            <span className="text-amber-700">
              Cancellation rate: {data ? data.kpis.cancellationRatePercent : 0}%
            </span>
          </div>
        </div>

        {/* ADR & Length of Stay */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white p-5 shadow-[0_12px_24px_-18px_rgba(58,48,42,0.15)] transition-all hover:border-[#b3541e]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78706a]">
              Average Daily Rate
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f0e8] text-[#b3541e]">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold tracking-tight text-[#3a302a]">
              {data ? formatCurrency(data.kpis.averageDailyRateEtb) : '—'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#605850]">
            <span>Avg stay: {data ? data.kpis.averageLengthOfStayNights : 0} nights</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart: Daily Revenue Flow */}
      <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline text-xl font-semibold text-[#3a302a]">
              Revenue & Escrow Trajectory
            </h2>
            <p className="text-xs text-[#78706a]">
              Daily Gross Booking Value (GBV) and Net Platform Take-Rate for {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#b3541e]" />
              <span className="text-[#3a302a]">Gross Booking Value (ETB)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#e08850]" />
              <span className="text-[#3a302a]">Platform Take-Rate (12%)</span>
            </div>
          </div>
        </div>

        {/* Hover Point Inspector Tooltip */}
        <div className="mt-3 flex h-8 items-center justify-between rounded-lg bg-[#f6f0e8] px-3 text-xs">
          {hoveredPoint ? (
            <>
              <span className="font-bold text-[#3a302a]">
                Date: {hoveredPoint.label} ({hoveredPoint.date})
              </span>
              <span className="font-semibold text-[#b3541e]">
                GBV: {formatCurrency(hoveredPoint.gbvEtb)}
              </span>
              <span className="font-semibold text-[#605850]">
                Net Revenue: {formatCurrency(hoveredPoint.revenueEtb)}
              </span>
              <span className="font-semibold text-[#78706a]">
                Bookings: {hoveredPoint.bookingsCount}
              </span>
            </>
          ) : (
            <span className="text-[#78706a]">
              Hover over any point on the trajectory curve to inspect daily volumes.
            </span>
          )}
        </div>

        {/* SVG Curve Rendering */}
        <div className="mt-4 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[240px] w-full min-w-[640px]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="gbvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b3541e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#b3541e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = chartHeight - paddingY - pct * plotHeight;
              const val = Math.round(maxGbv * pct);
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#eae2da"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[#9a9088] text-[9px] font-semibold"
                  >
                    {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area Fill for GBV */}
            {areaGbv && <path d={areaGbv} fill="url(#gbvGradient)" />}

            {/* GBV Line */}
            {pathGbv && (
              <path
                d={pathGbv}
                fill="none"
                stroke="#b3541e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Revenue Line */}
            {pathRev && (
              <path
                d={pathRev}
                fill="none"
                stroke="#e08850"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Dots */}
            {pointsGbv.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.date === pt.point.date ? 6 : 3}
                fill={hoveredPoint?.date === pt.point.date ? '#b3541e' : '#ffffff'}
                stroke="#b3541e"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredPoint(pt.point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Grid: Regional Destinations & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Destination Hubs Leaderboard */}
        <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                Top Regional Destinations
              </h3>
              <p className="text-xs text-[#78706a]">
                Volume and Gross Booking Value across Ethiopian hospitality hubs
              </p>
            </div>
            <Globe2 className="h-5 w-5 text-[#b3541e]" />
          </div>

          <div className="divide-y divide-[#f2ece4]">
            {data?.topDestinations && data.topDestinations.length > 0 ? (
              data.topDestinations.map((dest, i) => (
                <div key={dest.city} className="py-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f6f0e8] text-[10px] font-bold text-[#b3541e]">
                        {i + 1}
                      </span>
                      <span className="font-bold text-[#3a302a]">{dest.city}</span>
                      <span className="text-[#9a9088]">({dest.region})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#3a302a]">
                        {formatCurrency(dest.gbvEtb)}
                      </span>
                      <span className="ml-2 font-semibold text-[#78706a]">
                        {dest.bookingsCount} stays
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f2ece4]">
                    <div
                      className="h-full rounded-full bg-[#b3541e] transition-all duration-500"
                      style={{ width: `${Math.max(dest.sharePercent, 5)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-[#78706a]">
                No regional bookings recorded for this window.
              </p>
            )}
          </div>
        </div>

        {/* Property Category Share & Funnel */}
        <div className="space-y-6">
          {/* Architectural Categories */}
          <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                  Catalog Architecture Share
                </h3>
                <p className="text-xs text-[#78706a]">
                  Published property distribution across living categories
                </p>
              </div>
              <Home className="h-5 w-5 text-[#b3541e]" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data?.categoryDistribution.map((cat) => (
                <div
                  key={cat.slug}
                  className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center"
                >
                  <p className="truncate text-xs font-bold text-[#3a302a]">{cat.category}</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#b3541e]">
                    {cat.listingsCount}
                  </p>
                  <p className="text-[11px] font-semibold text-[#78706a]">
                    {cat.sharePercent}% of supply
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Status Funnel */}
          <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                  Booking Conversion Funnel
                </h3>
                <p className="text-xs text-[#78706a]">
                  Inquiry status transitions throughout the booking lifecycle
                </p>
              </div>
              <Layers className="h-5 w-5 text-[#b3541e]" />
            </div>

            <div className="space-y-2.5">
              {data?.bookingStatusFunnel.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-600'
                          : item.status === 'COMPLETED'
                            ? 'bg-sky-600'
                            : item.status === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                      }`}
                    />
                    <span className="font-bold text-[#3a302a]">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#605850]">{item.count} bookings</span>
                    <span className="w-12 text-right font-bold text-[#3a302a]">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
