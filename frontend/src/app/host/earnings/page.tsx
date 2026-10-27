'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import {
  HostEarningsSummary,
  HostTransactionsResponse,
  HostTransactionItem,
  PaymentStatus,
  HostListingsResponse,
  HostListingRow,
} from '../../../types/host';
import {
  BadgeDollarSign,
  CheckCircle2,
  Banknote,
  RotateCcw,
  AlertCircle,
  Calendar,
  Filter,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldAlert,
} from 'lucide-react';

function formatCurrency(amount: number, currency: string = 'ETB'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

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

function getPaymentStatusBadge(status: PaymentStatus) {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'ON_ARRIVAL':
      return {
        label: 'Pay on Arrival',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'PENDING':
      return {
        label: 'Pending',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

export default function HostEarningsPage() {
  const { user, loading: authLoading } = useAuth();

  // Filters
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [txPage, setTxPage] = useState<number>(1);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Data
  const [summary, setSummary] = useState<HostEarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<HostTransactionItem[]>([]);
  const [totalTx, setTotalTx] = useState<number>(0);
  const [totalTxPages, setTotalTxPages] = useState<number>(1);
  const [listings, setListings] = useState<HostListingRow[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load properties for filter dropdown
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;

    const loadProperties = async () => {
      try {
        const res = await apiFetch<HostListingsResponse>('/host/listings?limit=100');
        if (active) {
          setListings(res.data || []);
        }
      } catch {
        // Silently ignore filter dropdown failures
      }
    };

    void loadProperties();

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  // Load earnings summary and transactions
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;

    const loadData = async () => {
      try {
        queueMicrotask(() => {
          if (active) {
            setLoading(true);
            setError(null);
          }
        });

        // Build query params
        const summaryParams = new URLSearchParams();
        if (selectedPropertyId) summaryParams.set('propertyId', selectedPropertyId);
        if (startDate) summaryParams.set('startDate', startDate);
        if (endDate) summaryParams.set('endDate', endDate);

        const txParams = new URLSearchParams();
        txParams.set('page', String(txPage));
        txParams.set('limit', '15');
        if (selectedPropertyId) txParams.set('propertyId', selectedPropertyId);
        if (selectedPaymentStatus) txParams.set('paymentStatus', selectedPaymentStatus);
        if (startDate) txParams.set('startDate', startDate);
        if (endDate) txParams.set('endDate', endDate);

        const summaryQuery = summaryParams.toString() ? `?${summaryParams.toString()}` : '';
        const txQuery = txParams.toString() ? `?${txParams.toString()}` : '';

        const [summaryData, txData] = await Promise.all([
          apiFetch<HostEarningsSummary>(`/host/earnings/summary${summaryQuery}`),
          apiFetch<HostTransactionsResponse>(`/host/earnings/transactions${txQuery}`),
        ]);

        if (!active) return;
        setSummary(summaryData);
        setTransactions(txData.data || []);
        setTotalTx(txData.total || 0);
        setTotalTxPages(txData.totalPages || 1);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load financial records';
        setError(msg);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [
    authLoading,
    user,
    selectedPropertyId,
    selectedPaymentStatus,
    startDate,
    endDate,
    txPage,
    refreshKey,
  ]);

  const currency = summary?.currency || 'ETB';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. HEADER & CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#3a302a]">
              Host Earnings & Financials
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f2ece4] text-[#c2652a] border border-[#d8d0c8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c2652a]" />
              Verified Data
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#605850] mt-1">
            Real stored reservation financial metrics, confirmed gateway payments, and cash commitments.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-[#faf5ee] transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. PAYOUT LIMITATION & TRANSPARENCY NOTICE ── */}
      <div className="bg-[#f2ece4]/70 border border-[#d8d0c8] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="p-2 bg-[#faf5ee] rounded-xl text-[#c2652a] border border-[#d8d0c8] shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#3a302a] space-y-1">
          <h3 className="font-bold text-sm text-[#3a302a]">
            Payment Reconciliation & Settlement Notice
          </h3>
          <p className="leading-relaxed text-[#605850]">
            ENGIDA currently tracks real payment events processed via online gateways (Chapa) and cash-on-arrival reservation commitments.
            Automated host bank or mobile-money payouts are not yet supported; host disbursements and settlements are handled directly or per manual schedule.
          </p>
        </div>
      </div>

      {/* ── 3. FILTER BAR ── */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Property Filter */}
          <div>
            <label className="block font-bold text-[#3a302a] mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#605850]" />
              <span>Filter by Listing</span>
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setTxPage(1);
              }}
              className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 font-medium text-[#3a302a] focus:outline-hidden focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
            >
              <option value="">All Listings</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.city})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block font-bold text-[#3a302a] mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#605850]" />
              <span>Payment Status</span>
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setTxPage(1);
              }}
              className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 font-medium text-[#3a302a] focus:outline-hidden focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
            >
              <option value="">All Payment Statuses</option>
              <option value="PAID">Confirmed Paid (Online)</option>
              <option value="ON_ARRIVAL">Pay on Arrival (Cash)</option>
              <option value="PENDING">Pending Payment</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block font-bold text-[#3a302a] mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#605850]" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTxPage(1);
              }}
              className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 font-medium text-[#3a302a] focus:outline-hidden focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block font-bold text-[#3a302a] mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#605850]" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTxPage(1);
              }}
              className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 font-medium text-[#3a302a] focus:outline-hidden focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
            />
          </div>
        </div>

        {(selectedPropertyId || selectedPaymentStatus || startDate || endDate) && (
          <div className="mt-3 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs">
            <span className="text-[#605850]">Active filters applied</span>
            <button
              onClick={() => {
                setSelectedPropertyId('');
                setSelectedPaymentStatus('');
                setStartDate('');
                setEndDate('');
                setTxPage(1);
              }}
              className="text-[#c2652a] font-bold hover:text-[#e08850] hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── 4. ERROR STATE ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#3a302a] mb-1">
            Could not load financial records
          </h3>
          <p className="text-xs text-[#605850] mb-4">{error}</p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* ── 5. KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Booking Value */}
        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#605850] uppercase tracking-wider">
              Total Booking Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#f2ece4] text-[#c2652a] flex items-center justify-center border border-[#d8d0c8]">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#3a302a] tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-[#f2ece4] animate-pulse rounded-md" />
              ) : (
                formatCurrency(summary?.totalBookingValue || 0, currency)
              )}
            </div>
            <p className="text-[11px] text-[#605850] mt-1">
              Active & completed stays (
              {loading ? '…' : summary?.totalBookingsCount || 0} total bookings)
            </p>
          </div>
        </div>

        {/* Card 2: Confirmed Paid */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Confirmed Paid
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-slate-200 animate-pulse rounded-md" />
              ) : (
                formatCurrency(summary?.confirmedPaidAmount || 0, currency)
              )}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              Verified online receipts (
              {loading ? '…' : summary?.confirmedPaidCount || 0} paid transactions)
            </p>
          </div>
        </div>

        {/* Card 3: Pay on Arrival */}
        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-[#faf5ee] to-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider">
              Cash on Arrival
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#f2ece4] text-[#c2652a] flex items-center justify-center border border-[#d8d0c8]">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#3a302a] tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-[#f2ece4] animate-pulse rounded-md" />
              ) : (
                formatCurrency(summary?.onArrivalAmount || 0, currency)
              )}
            </div>
            <p className="text-[11px] text-[#605850] mt-1 font-medium">
              Cash payable by guests (
              {loading ? '…' : summary?.onArrivalCount || 0} reservations)
            </p>
          </div>
        </div>

        {/* Card 4: Refunds & Cancellations */}
        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Refunds / Cancellations
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-slate-200 animate-pulse rounded-md" />
              ) : (
                formatCurrency(summary?.refundedAmount || 0, currency)
              )}
            </div>
            <p className="text-[11px] text-rose-600 mt-1 font-medium">
              {loading
                ? '…'
                : `${summary?.cancelledCount || 0} cancelled (${formatCurrency(
                    summary?.cancelledBookingValue || 0,
                    currency,
                  )})`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 6. MONTHLY FINANCIAL OVERVIEW ── */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f2ece4] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#3a302a]">
              Monthly Financial Overview
            </h2>
            <p className="text-xs text-[#605850]">
              Aggregate breakdown by booking creation month based on actual stored ledger records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : summary?.monthlyBreakdown && summary.monthlyBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#605850] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Bookings</th>
                  <th className="py-2.5 px-3">Gross Value</th>
                  <th className="py-2.5 px-3">Paid Online</th>
                  <th className="py-2.5 px-3">Pay on Arrival</th>
                  <th className="py-2.5 px-3">Refunded</th>
                  <th className="py-2.5 px-3">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {summary.monthlyBreakdown.map((m) => (
                  <tr key={m.yearMonth} className="hover:bg-[#faf5ee]/80 transition">
                    <td className="py-3 px-3 font-bold text-[#3a302a]">{m.label}</td>
                    <td className="py-3 px-3 font-medium">{m.bookingCount}</td>
                    <td className="py-3 px-3 font-bold text-[#3a302a]">
                      {formatCurrency(m.totalBookingValue, currency)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700">
                      {formatCurrency(m.confirmedPaidAmount, currency)}
                      <span className="text-[10px] text-[#605850] font-normal ml-1">
                        ({m.confirmedPaidCount})
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#c2652a]">
                      {formatCurrency(m.onArrivalAmount, currency)}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#605850]">
                      {m.refundedAmount > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {formatCurrency(m.refundedAmount, currency)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#605850]">
                      {m.cancelledCount > 0 ? (
                        <span className="text-rose-600 font-semibold">{m.cancelledCount}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-[#605850] text-xs">
            No monthly booking data found for the selected timeframe.
          </div>
        )}
      </div>

      {/* ── 7. RESERVATION-LEVEL TRANSACTION HISTORY ── */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f2ece4] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#3a302a]">
              Reservation Transactions
            </h2>
            <p className="text-xs text-[#605850]">
              Itemized financial transactions, gateway references, and settlement states.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#605850]">
            {totalTx} total transactions
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#d8d0c8] text-[#605850] font-bold uppercase tracking-wider bg-[#faf5ee]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Property</th>
                    <th className="py-2.5 px-3">Guest</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Payment Status</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                  {transactions.map((tx) => {
                    const badge = getPaymentStatusBadge(tx.paymentStatus);
                    return (
                      <tr key={tx.id} className="hover:bg-[#faf5ee]/80 transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-[#3a302a]">
                            {formatDate(tx.checkInDate)}
                          </div>
                          <div className="text-[10px] text-[#605850]">
                            booked {formatDate(String(tx.createdAt))}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <Link
                            href={`/host/listings/${tx.propertyId}`}
                            className="font-bold text-[#3a302a] hover:text-[#c2652a] truncate block max-w-xs"
                          >
                            {tx.propertyTitle}
                          </Link>
                          <div className="text-[10px] text-[#605850]">{tx.propertyCity}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#3a302a]">{tx.guestName}</div>
                          <div className="text-[10px] text-[#605850]">{tx.guestEmail}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-[#3a302a]">
                            {tx.paymentMethod.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#605850]">
                          {tx.paymentReference ? (
                            <span title={tx.paymentReference}>
                              {tx.paymentReference.slice(0, 16)}…
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-extrabold text-[#3a302a]">
                            {formatCurrency(tx.totalPrice, tx.paymentCurrency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {transactions.map((tx) => {
                const badge = getPaymentStatusBadge(tx.paymentStatus);
                return (
                  <div
                    key={tx.id}
                    className="p-4 border border-[#d8d0c8] rounded-xl bg-[#faf5ee]/50 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#3a302a] text-sm block">
                          {tx.propertyTitle}
                        </span>
                        <span className="text-[11px] text-[#605850]">
                          {tx.propertyCity} • Guest: {tx.guestName}
                        </span>
                      </div>
                      <span className="text-sm font-black text-[#3a302a] whitespace-nowrap">
                        {formatCurrency(tx.totalPrice, tx.paymentCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#d8d0c8]">
                      <span className="text-[#605850]">
                        {formatDate(tx.checkInDate)} - {formatDate(tx.checkOutDate)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#605850]">
                      <span>Method: {tx.paymentMethod.replace(/_/g, ' ')}</span>
                      {tx.paymentReference && (
                        <span className="font-mono">Ref: {tx.paymentReference.slice(0, 12)}…</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalTxPages > 1 && (
              <div className="pt-4 border-t border-[#f2ece4] flex items-center justify-between text-xs">
                <button
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] font-bold text-[#3a302a] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="text-[#605850] font-semibold">
                  Page {txPage} of {totalTxPages}
                </span>

                <button
                  onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                  disabled={txPage >= totalTxPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] font-bold text-[#3a302a] disabled:opacity-40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-[#605850]">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-[1.5]" />
            <p className="text-xs font-semibold text-[#3a302a]">No transaction records found</p>
            <p className="text-[11px] text-[#605850] mt-0.5">
              Reservations and payments for your properties will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
