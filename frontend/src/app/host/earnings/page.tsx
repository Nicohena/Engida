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
  HostPayoutAccount,
  HostPayoutRow,
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
  ShieldCheck,
  Plus,
  ArrowUpRight,
  FileText,
  Clock,
  Landmark,
  Wallet,
} from 'lucide-react';

function formatCurrency(amount: number, currency: string = 'ETB'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
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

function getPayoutStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return { label: 'Disbursed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'PROCESSING':
      return { label: 'Processing', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'PENDING_APPROVAL':
    case 'SCHEDULED':
      return { label: 'Scheduled', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'FAILED':
      return { label: 'Failed', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export default function HostEarningsPage() {
  const { user, loading: authLoading } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PAYOUTS'>('OVERVIEW');

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

  // Payout data
  const [payoutAccounts, setPayoutAccounts] = useState<HostPayoutAccount[]>([]);
  const [payouts, setPayouts] = useState<HostPayoutRow[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState<boolean>(false);
  const [accountFormError, setAccountFormError] = useState<string | null>(null);

  // New account form state
  const [newAccount, setNewAccount] = useState({
    provider: 'CBE',
    bankName: 'Commercial Bank of Ethiopia',
    accountName: '',
    accountNumber: '',
    phone: '',
    bankBranch: '',
  });

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
        window.setTimeout(() => {
          if (active) {
            setLoading(true);
            setError(null);
          }
        }, 0);

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

        const [summaryData, txData, accountsData, payoutsData] = await Promise.all([
          apiFetch<HostEarningsSummary>(`/host/earnings/summary${summaryQuery}`),
          apiFetch<HostTransactionsResponse>(`/host/earnings/transactions${txQuery}`),
          apiFetch<HostPayoutAccount[]>('/host/payout-accounts').catch(() => []),
          apiFetch<HostPayoutRow[]>('/host/payouts').catch(() => []),
        ]);

        if (!active) return;
        setSummary(summaryData);
        setTransactions(txData.data || []);
        setTotalTx(txData.total || 0);
        setTotalTxPages(txData.totalPages || 1);
        setPayoutAccounts(accountsData);
        setPayouts(payoutsData);
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAccount(true);
    setAccountFormError(null);

    try {
      await apiFetch('/host/payout-accounts', {
        method: 'POST',
        body: JSON.stringify({
          provider: newAccount.provider,
          accountName: newAccount.accountName,
          accountNumber: newAccount.accountNumber,
          phone: newAccount.phone || undefined,
          bankName: newAccount.bankName,
          bankBranch: newAccount.bankBranch || undefined,
          currency: 'ETB',
        }),
      });

      setShowAddAccountModal(false);
      setNewAccount({
        provider: 'CBE',
        bankName: 'Commercial Bank of Ethiopia',
        accountName: '',
        accountNumber: '',
        phone: '',
        bankBranch: '',
      });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setAccountFormError(err.message || 'Failed to register payout account');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── 1. HEADER & CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#252923]">
              Host Treasury & Payouts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#234B36]" />
              Double-Entry Protected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#73776F] mt-1">
            Real-time ledger balances, verified escrow custody, and automated daily payouts.
          </p>
        </div>

        {/* Tab switcher & refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#F8F5ED] p-1 rounded-xl border border-[#E5E0D5]">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-white text-[#252923] shadow-xs'
                  : 'text-[#73776F] hover:text-[#252923]'
              }`}
            >
              Overview & Transactions
            </button>
            <button
              onClick={() => setActiveTab('PAYOUTS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'PAYOUTS'
                  ? 'bg-white text-[#252923] shadow-xs'
                  : 'text-[#73776F] hover:text-[#252923]'
              }`}
            >
              Payouts & Banking ({payoutAccounts.length})
            </button>
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] text-xs font-bold text-[#252923] hover:bg-[#F8F5ED] transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. TREASURY GUARANTEE BANNER ── */}
      <div className="bg-[#EEF3EF]/70 border border-[#E5E0D5] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="p-2 bg-[#F8F5ED] rounded-xl text-[#234B36] border border-[#E5E0D5] shrink-0">
          <Landmark className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#252923] space-y-1">
          <h3 className="font-bold text-sm text-[#252923]">
            ENGIDA Treasury & Escrow Protection Notice
          </h3>
          <p className="leading-relaxed text-[#73776F]">
            Guest payments are secured in provider escrow or split custody upon booking. Escrow releases automatically 24 hours after check-in, crediting your Available for Payout ledger balance. Payouts are executed daily via automated batches to verified Ethiopian bank accounts and Telebirr wallets.
          </p>
        </div>
      </div>

      {/* ── 3. DOUBLE-ENTRY LEDGER KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available for Payout (Account 2020) */}
        <div className="bg-white border-2 border-[#234B36]/30 rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-[#EEF3EF]/40 to-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-[#234B36] uppercase tracking-wider">
              Available for Payout
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#252923] tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-[#EEF3EF] animate-pulse rounded-md" />
              ) : (
                formatCurrency(
                  summary?.ledgerAvailableMinor
                    ? Number(summary.ledgerAvailableMinor) / 100
                    : 0,
                  currency,
                )
              )}
            </div>
            <p className="text-[11px] text-[#234B36] mt-1 font-bold">
              Cleared Host Payable (ready for next batch)
            </p>
          </div>
        </div>

        {/* Card 2: In Escrow Custody (Account 2010) */}
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#73776F] uppercase tracking-wider">
              Held in Escrow
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center border border-[#E5E0D5]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#252923] tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-[#EEF3EF] animate-pulse rounded-md" />
              ) : (
                formatCurrency(
                  summary?.ledgerPendingEscrowMinor
                    ? Number(summary.ledgerPendingEscrowMinor) / 100
                    : 0,
                  currency,
                )
              )}
            </div>
            <p className="text-[11px] text-[#73776F] mt-1">
              Active stays · releases 24h post check-in
            </p>
          </div>
        </div>

        {/* Card 3: Disbursed Payouts */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Total Disbursed
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
                formatCurrency(
                  summary?.ledgerPaidTotalMinor
                    ? Number(summary.ledgerPaidTotalMinor) / 100
                    : summary?.confirmedPaidAmount || 0,
                  currency,
                )
              )}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              Transferred to host bank & mobile accounts
            </p>
          </div>
        </div>

        {/* Card 4: Gross Booking Value */}
        <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#73776F] uppercase tracking-wider">
              Gross Stays Booked
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center border border-[#E5E0D5]">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#252923] tracking-tight">
              {loading ? (
                <div className="h-7 w-28 bg-[#EEF3EF] animate-pulse rounded-md" />
              ) : (
                formatCurrency(summary?.totalBookingValue || 0, currency)
              )}
            </div>
            <p className="text-[11px] text-[#73776F] mt-1">
              {summary?.totalBookingsCount || 0} lifetime reservations
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. TAB CONTENT ── */}
      {activeTab === 'OVERVIEW' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-[#252923] mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#73776F]" />
                  <span>Filter by Listing</span>
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-medium text-[#252923] focus:outline-hidden focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                >
                  <option value="">All Listings</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#252923] mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#73776F]" />
                  <span>Payment Status</span>
                </label>
                <select
                  value={selectedPaymentStatus}
                  onChange={(e) => {
                    setSelectedPaymentStatus(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-medium text-[#252923] focus:outline-hidden focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                >
                  <option value="">All Payment Statuses</option>
                  <option value="PAID">Confirmed Paid (Online)</option>
                  <option value="PENDING">Pending Payment</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#252923] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#73776F]" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-1.5 font-medium text-[#252923] focus:outline-hidden focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#252923] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#73776F]" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-1.5 font-medium text-[#252923] focus:outline-hidden focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF3EF] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#252923]">
                  Monthly Financial Summary
                </h2>
                <p className="text-xs text-[#73776F]">
                  Itemized by booking creation month from verified ledger records.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[#F8F5ED] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : summary?.monthlyBreakdown && summary.monthlyBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] text-[#73776F] font-bold uppercase tracking-wider bg-[#F8F5ED]">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Bookings</th>
                      <th className="py-2.5 px-3">Gross Value</th>
                      <th className="py-2.5 px-3">Paid Online</th>
                      <th className="py-2.5 px-3">Refunded</th>
                      <th className="py-2.5 px-3">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3EF] text-[#252923]">
                    {summary.monthlyBreakdown.map((m) => (
                      <tr key={m.yearMonth} className="hover:bg-[#F8F5ED]/80 transition">
                        <td className="py-3 px-3 font-bold text-[#252923]">{m.label}</td>
                        <td className="py-3 px-3 font-medium">{m.bookingCount}</td>
                        <td className="py-3 px-3 font-bold text-[#252923]">
                          {formatCurrency(m.totalBookingValue, currency)}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {formatCurrency(m.confirmedPaidAmount, currency)}
                          <span className="text-[10px] text-[#73776F] font-normal ml-1">
                            ({m.confirmedPaidCount})
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#73776F]">
                          {m.refundedAmount > 0 ? (
                            <span className="text-rose-600 font-bold">
                              {formatCurrency(m.refundedAmount, currency)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#73776F]">
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
              <div className="py-8 text-center text-[#73776F] text-xs">
                No monthly booking data found for the selected timeframe.
              </div>
            )}
          </div>

          {/* Reservation Transactions Table */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEF3EF] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#252923]">
                  Reservation Transactions
                </h2>
                <p className="text-xs text-[#73776F]">
                  Itemized receipts and gateway settlement references.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#73776F]">
                {totalTx} total transactions
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#F8F5ED] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] text-[#73776F] font-bold uppercase tracking-wider bg-[#F8F5ED]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Property</th>
                      <th className="py-2.5 px-3">Guest</th>
                      <th className="py-2.5 px-3">Gateway</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3EF] text-[#252923]">
                    {transactions.map((tx) => {
                      const badge = getPaymentStatusBadge(tx.paymentStatus);
                      return (
                        <tr key={tx.id} className="hover:bg-[#F8F5ED]/80 transition">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-[#252923]">
                              {formatDate(tx.checkInDate)}
                            </div>
                            <div className="text-[10px] text-[#73776F]">
                              booked {formatDate(String(tx.createdAt))}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <Link
                              href={`/host/listings/${tx.propertyId}`}
                              className="font-bold text-[#252923] hover:text-[#234B36] truncate block max-w-xs"
                            >
                              {tx.propertyTitle}
                            </Link>
                            <div className="text-[10px] text-[#73776F]">{tx.propertyCity}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#252923]">{tx.guestName}</div>
                            <div className="text-[10px] text-[#73776F]">{tx.guestEmail}</div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-medium text-[#252923]">
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

                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#73776F]">
                            {tx.paymentReference ? (
                              <span title={tx.paymentReference}>
                                {tx.paymentReference.slice(0, 16)}…
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="font-extrabold text-[#252923]">
                              {formatCurrency(tx.totalPrice, tx.paymentCurrency)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-[#73776F]">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-[1.5]" />
                <p className="text-xs font-semibold text-[#252923]">No transaction records found</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── PAYOUTS & BANKING TAB ── */
        <div className="space-y-6">
          {/* Payout Accounts Card */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF3EF] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#252923]">
                  Verified Payout Accounts
                </h2>
                <p className="text-xs text-[#73776F]">
                  Accounts receiving automated 02:00 Addis scheduled payouts. Numbers are stored encrypted (AES-256-GCM).
                </p>
              </div>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#234B36] hover:bg-[#2D5E43] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payout Account</span>
              </button>
            </div>

            {payoutAccounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {payoutAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 border border-[#E5E0D5] rounded-xl bg-[#F8F5ED]/40 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#252923]">
                        {acc.bankName || acc.provider}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          acc.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-black text-[#252923]">
                      •••• {acc.accountNumberLast4}
                    </div>
                    <div className="text-[11px] text-[#73776F] flex justify-between items-center">
                      <span>{acc.accountName}</span>
                      {acc.phoneLast4 && <span>Tel: •••• {acc.phoneLast4}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[#73776F] bg-[#F8F5ED]/50 rounded-xl border border-dashed border-[#E5E0D5]">
                <Banknote className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#234B36]" />
                <p className="text-xs font-bold text-[#252923]">No payout accounts linked</p>
                <p className="text-[11px] text-[#73776F] mt-1 max-w-sm mx-auto">
                  Add your Commercial Bank of Ethiopia (CBE) account or Telebirr wallet to receive automated daily payouts.
                </p>
                <button
                  onClick={() => setShowAddAccountModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#234B36] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Link Payout Account
                </button>
              </div>
            )}
          </div>

          {/* Payout History Table */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF3EF] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#252923]">
                  Payout Disbursement History
                </h2>
                <p className="text-xs text-[#73776F]">
                  Batched remittance statements and transfer statuses.
                </p>
              </div>
            </div>

            {payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] text-[#73776F] font-bold uppercase tracking-wider bg-[#F8F5ED]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Batch ID</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3EF] text-[#252923]">
                    {payouts.map((p) => {
                      const badge = getPayoutStatusBadge(p.status);
                      return (
                        <tr key={p.id} className="hover:bg-[#F8F5ED]/80 transition">
                          <td className="py-3 px-3 whitespace-nowrap font-medium">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#73776F]">
                            {p.id.slice(0, 8)}…
                          </td>
                          <td className="py-3 px-3 font-mono">
                            •••• {p.accountLast4 || 'N/A'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#252923]">
                            {formatCurrency(Number(p.amountMinor) / 100, p.currency)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const stmt = await apiFetch<any>(`/host/payouts/${p.id}/statement`);
                                  alert(`Statement: ${stmt.statementId}\nAmount: ${formatCurrency(Number(stmt.amountMinor) / 100, stmt.currency)}\nGenerated: ${stmt.generatedAt}`);
                                } catch (err: any) {
                                  alert(err.message || 'Failed to download statement');
                                }
                              }}
                              className="text-[#234B36] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Statement</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-[#73776F]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#234B36]" />
                <p className="text-xs font-semibold text-[#252923]">No payout history yet</p>
                <p className="text-[11px] text-[#73776F] mt-0.5">
                  When funds release from escrow, payouts disburse daily to your verified destination.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. ADD PAYOUT ACCOUNT MODAL ── */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E5E0D5] overflow-hidden">
            <div className="bg-[#234B36] text-white p-5">
              <h3 className="font-extrabold text-lg">Add Host Payout Account</h3>
              <p className="text-xs text-[#EEF3EF] mt-0.5">
                Encrypted bank or mobile-money destination for daily disbursements.
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4 text-xs">
              {accountFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{accountFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#252923] mb-1">
                  Payout Provider
                </label>
                <select
                  value={newAccount.provider}
                  onChange={(e) => {
                    const prov = e.target.value;
                    let bankName = 'Commercial Bank of Ethiopia';
                    if (prov === 'TELEBIRR') bankName = 'Telebirr (Ethio Telecom)';
                    else if (prov === 'AWASH') bankName = 'Awash Bank';
                    else if (prov === 'DASHEN') bankName = 'Dashen Bank';
                    else if (prov === 'ABYSSINIA') bankName = 'Bank of Abyssinia';
                    setNewAccount((prev) => ({ ...prev, provider: prov, bankName }));
                  }}
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-medium"
                >
                  <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="TELEBIRR">Telebirr Direct Wallet</option>
                  <option value="AWASH">Awash Bank</option>
                  <option value="DASHEN">Dashen Bank</option>
                  <option value="ABYSSINIA">Bank of Abyssinia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#252923] mb-1">
                  Account Holder Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                  placeholder="e.g. Almaz Bekele Tessema"
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[#252923] mb-1">
                  {newAccount.provider === 'TELEBIRR'
                    ? 'Telebirr Registered Mobile Number'
                    : 'Bank Account Number'}
                </label>
                <input
                  type="text"
                  required
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  placeholder={
                    newAccount.provider === 'TELEBIRR'
                      ? '0911223344'
                      : '1000123456789'
                  }
                  className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-mono font-medium"
                />
              </div>

              {newAccount.provider !== 'TELEBIRR' && (
                <div>
                  <label className="block font-bold text-[#252923] mb-1">
                    Branch Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAccount.bankBranch}
                    onChange={(e) => setNewAccount({ ...newAccount, bankBranch: e.target.value })}
                    placeholder="e.g. Bole Medhanealem Branch"
                    className="w-full bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 border border-[#E5E0D5] text-[#252923] font-bold rounded-xl hover:bg-[#F8F5ED] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="px-4 py-2 bg-[#234B36] hover:bg-[#2D5E43] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAccount ? 'Verifying with Provider…' : 'Save & Verify Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
