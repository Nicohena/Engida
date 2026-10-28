'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import type { RefundListItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import AdminDialog from '../../../../components/admin/AdminDialog';

export default function RefundsTab() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundListItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'EXECUTE' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Propose form state
  const [proposeForm, setProposeForm] = useState({
    bookingId: '',
    amountMinor: '',
    reason: '',
  });

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch<{ data: RefundListItem[] }>(
        `/admin/finance/refunds?${params.toString()}`,
      );
      setRefunds(res.data || []);
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const handleProposeRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      await apiFetch('/admin/finance/refunds', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: proposeForm.bookingId,
          amountMinor: proposeForm.amountMinor ? String(Number(proposeForm.amountMinor) * 100) : undefined,
          reason: proposeForm.reason,
        }),
      });

      setShowProposeModal(false);
      setProposeForm({ bookingId: '', amountMinor: '', reason: '' });
      fetchRefunds();
    } catch (err: any) {
      setModalError(err.message || 'Failed to propose refund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund || !actionType) return;
    setSubmitting(true);
    setModalError(null);

    try {
      if (actionType === 'APPROVE') {
        await apiFetch(`/admin/finance/refunds/${selectedRefund.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Dual approval signed' }),
        });
      } else if (actionType === 'REJECT') {
        await apiFetch(`/admin/finance/refunds/${selectedRefund.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      } else if (actionType === 'EXECUTE') {
        await apiFetch(`/admin/finance/refunds/${selectedRefund.id}/execute`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }

      setSelectedRefund(null);
      setActionType(null);
      setReason('');
      fetchRefunds();
    } catch (err: any) {
      setModalError(err.message || 'Failed to process refund action');
    } finally {
      setSubmitting(false);
    }
  };

  const getTone = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'success';
      case 'APPROVED':
        return 'accent';
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
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
      {/* Top Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#605850]">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a302a]"
          >
            <option value="ALL">All Refunds</option>
            <option value="PENDING_APPROVAL">Pending Dual Approval</option>
            <option value="APPROVED">Approved (Ready to Execute)</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProposeModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#b3541e] hover:bg-[#934313] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Propose Refund</span>
          </button>
          <button
            onClick={fetchRefunds}
            className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : refunds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Reason / Policy</th>
                  <th className="py-3 px-4">Status & Approval</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {refunds.map((r) => {
                  const isProposer = user?.id === r.proposedById;
                  const canApprove = !isProposer;
                  return (
                    <tr key={r.id} className="hover:bg-[#faf5ee]/60 transition">
                      <td className="py-3 px-4 text-[#73776f] whitespace-nowrap">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {r.bookingReference || r.bookingId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-[#3a302a] truncate">{r.reason}</div>
                        {r.policyTier && (
                          <span className="text-[10px] text-[#73776f]">Policy: {r.policyTier}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <AdminStatusBadge label={r.status} tone={getTone(r.status)} dot />
                          {r.requiresDualApproval && (
                            <span className="text-[10px] bg-[#f7ebda] text-[#95631f] border border-[#ecd9c2] px-2 py-0.5 rounded-full font-bold">
                              Dual Approval Required
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#73776f] mt-0.5">
                          Proposed by: {r.proposedByName || r.proposedById.slice(0, 8)}
                          {isProposer && ' (You)'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {formatMinor(r.amountMinor, r.currency)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {r.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRefund(r);
                                setActionType('APPROVE');
                              }}
                              disabled={!canApprove}
                              title={
                                !canApprove
                                  ? 'Dual approval violation: You proposed this refund and cannot approve it yourself.'
                                  : undefined
                              }
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                                canApprove
                                  ? 'border-[#d6dfcd] bg-[#edf1e8] text-[#536b4a] hover:bg-emerald-100 cursor-pointer'
                                  : 'border-[#d8d0c8] bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRefund(r);
                                setActionType('REJECT');
                              }}
                              className="px-2 py-1 rounded-lg border border-[#ebd0c9] bg-[#f8e9e5] text-[#9a3f33] hover:bg-rose-100 text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setSelectedRefund(r);
                              setActionType('EXECUTE');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#b3541e] text-white hover:bg-[#934313] text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Execute Refund
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
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#b3541e]" />
            <p className="text-xs font-bold text-[#3a302a]">No refund records found</p>
          </div>
        )}
      </div>

      {/* Propose Refund Modal */}
      {showProposeModal && (
        <AdminDialog
          open={showProposeModal}
          onClose={() => setShowProposeModal(false)}
          title="Propose Policy Refund"
          description="Initiate an auditable refund request. Amounts exceeding ETB 5,000.00 require dual administrator approval."
        >
          <form onSubmit={handleProposeRefund} className="space-y-4 text-xs">
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">
                Booking ID (UUID)
              </label>
              <input
                type="text"
                required
                value={proposeForm.bookingId}
                onChange={(e) => setProposeForm({ ...proposeForm, bookingId: e.target.value })}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 font-mono text-xs text-[#3a302a] outline-none focus:border-[#b3541e]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">
                Refund Amount in ETB (Leave blank for policy auto-computation)
              </label>
              <input
                type="number"
                step="0.01"
                value={proposeForm.amountMinor}
                onChange={(e) => setProposeForm({ ...proposeForm, amountMinor: e.target.value })}
                placeholder="e.g. 1250.00"
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 text-xs text-[#3a302a] outline-none focus:border-[#b3541e]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">
                Reason / Guest Justification
              </label>
              <textarea
                required
                rows={3}
                value={proposeForm.reason}
                onChange={(e) => setProposeForm({ ...proposeForm, reason: e.target.value })}
                placeholder="Detailed reason for refund proposal..."
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-3 text-xs text-[#3a302a] outline-none focus:border-[#b3541e]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => setShowProposeModal(false)}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#b3541e] hover:bg-[#934313] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {submitting ? 'Submitting…' : 'Propose Refund'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}

      {/* Approve / Reject / Execute Modal */}
      {selectedRefund && actionType && (
        <AdminDialog
          open={!!selectedRefund}
          onClose={() => {
            setSelectedRefund(null);
            setActionType(null);
          }}
          title={
            actionType === 'APPROVE'
              ? 'Dual Approval: Authorize Refund'
              : actionType === 'REJECT'
              ? 'Reject Refund Request'
              : 'Execute Approved Refund'
          }
          description={`Refund ID: ${selectedRefund.id.slice(0, 8)} · Amount: ${formatMinor(selectedRefund.amountMinor, selectedRefund.currency)}`}
        >
          <form onSubmit={handleAction} className="space-y-4 text-xs">
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {actionType === 'EXECUTE' ? (
              <div className="bg-[#faefe2] p-4 rounded-xl border border-[#ecd9c2] text-[#95631f] space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#b3541e]" />
                  <span>Dual Approval Completed</span>
                </div>
                <p className="leading-relaxed">
                  Executing this refund will initiate provider reversal through the configured payment gateway and post balanced double-entry entries reversing guest payment and host escrow liabilities.
                </p>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-[#3a302a] mb-1">
                  Audit Notes / Reason
                </label>
                <textarea
                  required={actionType === 'REJECT'}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'Approved per policy verification...'
                      : 'State clear operational grounds for rejection...'
                  }
                  className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-3 text-xs text-[#3a302a] outline-none focus:border-[#b3541e]"
                />
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => {
                  setSelectedRefund(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 text-white font-bold rounded-xl shadow-xs cursor-pointer ${
                  actionType === 'REJECT'
                    ? 'bg-[#9a3f33] hover:bg-rose-700'
                    : 'bg-[#b3541e] hover:bg-[#934313]'
                }`}
              >
                {submitting ? 'Processing…' : `Confirm ${actionType}`}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
