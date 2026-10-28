'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  CreditCard,
  RotateCcw,
  ExternalLink,
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import type { PaymentListItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import AdminDialog from '../../../../components/admin/AdminDialog';

export default function PaymentsTab() {
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{ data: PaymentListItem[]; total: number }>(
        `/admin/finance/payments?${params.toString()}`,
      );
      setPayments(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const handleInspect = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await apiFetch<any>(`/admin/finance/payments/${id}`);
      setSelectedPayment(detail);
    } catch {
      // Failed to inspect
    } finally {
      setDetailLoading(false);
    }
  };

  const getTone = (status: string) => {
    switch (status) {
      case 'CAPTURED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REFUNDED':
        return 'accent';
      case 'FAILED':
      case 'EXPIRED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#73776f] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
            placeholder="Search booking ref, provider tx..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#faf5ee] border border-[#d8d0c8] rounded-xl text-xs font-medium text-[#3a302a] outline-none focus:border-[#b3541e]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a302a]"
          >
            <option value="ALL">All Statuses</option>
            <option value="CAPTURED">Captured</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={() => fetchPayments()}
            className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Provider / Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#faf5ee]/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-[#73776f]">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#3a302a]">
                      {p.bookingReference || p.bookingId.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {p.guestName || 'Engida Guest'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold">{p.provider}</span>
                      <span className="text-[10px] text-[#73776f] ml-1.5">
                        ({p.paymentMethod})
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AdminStatusBadge label={p.status} tone={getTone(p.status)} dot />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      {formatMinor(p.amountMinor, p.currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspect(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] text-xs font-bold text-[#3a302a] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[#73776f]">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#b3541e]" />
            <p className="text-xs font-bold text-[#3a302a]">No payment records found</p>
            <p className="text-[11px] text-[#73776f] mt-0.5">
              Guest checkout sessions will be captured and displayed here.
            </p>
          </div>
        )}
      </div>

      {/* Inspect Payment Dialog */}
      {selectedPayment && (
        <AdminDialog
          open={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment ${selectedPayment.id.slice(0, 8)}`}
          description="Authoritative quote binding, provider event stream, and ledger posting details."
          width="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-[#faf5ee] p-4 rounded-xl border border-[#d8d0c8]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#73776f]">Status</span>
                <div className="mt-1">
                  <AdminStatusBadge
                    label={selectedPayment.status}
                    tone={getTone(selectedPayment.status)}
                    dot
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#73776f]">Amount</span>
                <p className="font-mono text-base font-bold text-[#3a302a]">
                  {formatMinor(selectedPayment.amountMinor, selectedPayment.currency)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#73776f]">Provider Tx ID</span>
                <p className="font-mono text-[#3a302a]">
                  {selectedPayment.providerTransactionId || 'Pending Provider'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#73776f]">Idempotency Key</span>
                <p className="font-mono text-[#73776f] truncate">
                  {selectedPayment.idempotencyKey || '—'}
                </p>
              </div>
            </div>

            {/* Event Audit Stream */}
            <div>
              <h4 className="font-bold text-xs text-[#3a302a] mb-2">Provider Webhook Stream</h4>
              {selectedPayment.providerEvents && selectedPayment.providerEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedPayment.providerEvents.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-white border border-[#d8d0c8] rounded-xl font-mono text-[11px] space-y-1"
                    >
                      <div className="flex justify-between text-[#73776f]">
                        <span className="font-bold text-[#3a302a]">{ev.eventType}</span>
                        <span>{formatDateTime(ev.createdAt)}</span>
                      </div>
                      <div className="text-[#605850]">Signature: {ev.signatureValid ? 'VALID' : 'INVALID'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#73776f] italic">No provider webhooks logged yet.</p>
              )}
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
