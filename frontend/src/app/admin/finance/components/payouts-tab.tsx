'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import type { PayoutListItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime, formatDateOnly } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import AdminDialog from '../../../../components/admin/AdminDialog';

export default function PayoutsTab() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<PayoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [actionPayout, setActionPayout] = useState<PayoutListItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'RETRY' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batching, setBatching] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch<{ data: PayoutListItem[] }>(
        `/admin/finance/payouts?${params.toString()}`,
      );
      setPayouts(res.data || []);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const handleRunBatch = async () => {
    setBatching(true);
    setBatchMessage(null);
    try {
      const result = await apiFetch<{ createdCount: number }>('/admin/finance/payouts/batch', {
        method: 'POST',
      });
      setBatchMessage(`Daily payout batch completed: ${result.createdCount} host payout(s) generated.`);
      fetchPayouts();
    } catch (err: any) {
      setBatchMessage(err.message || 'Failed to trigger payout batch');
    } finally {
      setBatching(false);
    }
  };

  const handleAction = async () => {
    if (!actionPayout || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === 'APPROVE') {
        await apiFetch(`/admin/finance/payouts/${actionPayout.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Approved by second administrator' }),
        });
      } else if (actionType === 'RETRY') {
        await apiFetch(`/admin/finance/payouts/${actionPayout.id}/retry`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }
      setActionPayout(null);
      setActionType(null);
      fetchPayouts();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getTone = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PROCESSING':
        return 'accent';
      case 'PENDING_APPROVAL':
      case 'SCHEDULED':
        return 'warning';
      case 'FAILED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Batch Run */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#605850]">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a302a]"
          >
            <option value="ALL">All Payouts</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Disbursed (Paid)</option>
            <option value="FAILED">Failed Transfers</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBatch}
            disabled={batching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#234b36] hover:bg-[#1a3828] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${batching ? 'animate-spin' : ''}`} />
            <span>{batching ? 'Running 02:00 Batch…' : 'Trigger Payout Batch'}</span>
          </button>
          <button
            onClick={fetchPayouts}
            className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {batchMessage && (
        <div className="p-3 bg-[#edf1e8] border border-[#d6dfcd] text-[#536b4a] rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{batchMessage}</span>
        </div>
      )}

      {/* Payouts Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Host</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {payouts.map((p) => {
                  const isProposer = user?.id === p.proposedById;
                  const canApprove = !isProposer;
                  return (
                    <tr key={p.id} className="hover:bg-[#faf5ee]/60 transition">
                      <td className="py-3 px-4 text-[#73776f] whitespace-nowrap">
                        {formatDateTime(p.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#3a302a]">{p.hostName || 'Host'}</div>
                        <div className="font-mono text-[10px] text-[#73776f]">ID: {p.hostId.slice(0, 8)}…</div>
                      </td>
                      <td className="py-3 px-4 text-[#73776f] whitespace-nowrap">
                        {formatDateOnly(p.periodStart)} → {formatDateOnly(p.periodEnd)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        •••• {p.accountLast4 || 'N/A'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AdminStatusBadge label={p.status} tone={getTone(p.status)} dot />
                        {p.requiresDualApproval && (
                          <span className="text-[10px] bg-[#f7ebda] text-[#95631f] border border-[#ecd9c2] px-2 py-0.5 rounded-full font-bold ml-1.5">
                            Dual Approval
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {formatMinor(p.amountMinor, p.currency)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {p.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => {
                              setActionPayout(p);
                              setActionType('APPROVE');
                            }}
                            disabled={!canApprove}
                            title={!canApprove ? 'You proposed this batch.' : undefined}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                              canApprove
                                ? 'border-[#d6dfcd] bg-[#edf1e8] text-[#536b4a] hover:bg-emerald-100 cursor-pointer'
                                : 'border-[#d8d0c8] bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Approve
                          </button>
                        )}
                        {p.status === 'FAILED' && (
                          <button
                            onClick={() => {
                              setActionPayout(p);
                              setActionType('RETRY');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] text-xs font-bold text-[#b3541e] cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[#73776f]">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#234b36]" />
            <p className="text-xs font-bold text-[#3a302a]">No payout batches found</p>
          </div>
        )}
      </div>

      {/* Approve / Retry Modal */}
      {actionPayout && actionType && (
        <AdminDialog
          open={!!actionPayout}
          onClose={() => {
            setActionPayout(null);
            setActionType(null);
          }}
          title={
            actionType === 'APPROVE'
              ? 'Authorize Host Payout Batch'
              : 'Retry Failed Payout Transfer'
          }
          description={`Payout ID: ${actionPayout.id.slice(0, 8)} · Host: ${actionPayout.hostName || actionPayout.hostId.slice(0, 8)} · Amount: ${formatMinor(actionPayout.amountMinor, actionPayout.currency)}`}
        >
          <div className="space-y-4 text-xs">
            <p className="leading-relaxed text-[#605850]">
              {actionType === 'APPROVE'
                ? 'Authorizing this payout certifies that all escrow holds have cleared the 24h post check-in policy and will trigger automated provider transfer to destination •••• ' + actionPayout.accountLast4 + '.'
                : 'Retrying will re-query the provider transfer API or attempt a new transfer instruction.'}
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => {
                  setActionPayout(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={submitting}
                className="px-4 py-2 bg-[#234b36] hover:bg-[#1a3828] text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {submitting ? 'Executing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
