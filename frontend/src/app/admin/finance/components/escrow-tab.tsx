'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Lock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import type { EscrowHoldListItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import AdminDialog from '../../../../components/admin/AdminDialog';

export default function EscrowTab() {
  const [holds, setHolds] = useState<EscrowHoldListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionHold, setActionHold] = useState<EscrowHoldListItem | null>(null);
  const [actionType, setActionType] = useState<'RELEASE' | 'FREEZE' | 'UNFREEZE' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchHolds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch<{ data: EscrowHoldListItem[] }>(
        `/admin/finance/escrow-holds?${params.toString()}`,
      );
      setHolds(res.data || []);
    } catch {
      setHolds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolds();
  }, [statusFilter]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionHold || !actionType) return;
    setSubmitting(true);
    setActionError(null);

    try {
      if (actionType === 'RELEASE') {
        await apiFetch(`/admin/finance/escrow-holds/${actionHold.id}/release`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Manual admin release' }),
        });
      } else if (actionType === 'FREEZE') {
        await apiFetch(`/admin/finance/escrow-holds/${actionHold.id}/freeze`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      } else if (actionType === 'UNFREEZE') {
        await apiFetch(`/admin/finance/escrow-holds/${actionHold.id}/unfreeze`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      }

      setActionHold(null);
      setActionType(null);
      setReason('');
      fetchHolds();
    } catch (err: any) {
      setActionError(err.message || 'Escrow action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#605850]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a302a]"
          >
            <option value="ALL">All Holds</option>
            <option value="HELD">Held in Custody</option>
            <option value="DISPUTED">Dispute Frozen</option>
            <option value="RELEASED">Released to Host</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <button
          onClick={fetchHolds}
          className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Holds Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : holds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Property & Host</th>
                  <th className="py-3 px-4">Status & Dispute</th>
                  <th className="py-3 px-4">Release Due</th>
                  <th className="py-3 px-4 text-right">Escrow Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {holds.map((h) => {
                  const isReleased = h.status === 'RELEASED';
                  const isDisputed = h.disputeFrozen || h.status === 'DISPUTED';
                  return (
                    <tr key={h.id} className="hover:bg-[#faf5ee]/60 transition">
                      <td className="py-3 px-4 font-mono font-bold">
                        {h.bookingReference || h.bookingId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#3a302a]">
                          {h.propertyTitle || 'Property'}
                        </div>
                        <div className="text-[10px] text-[#73776f]">Host: {h.hostName || 'Host'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <AdminStatusBadge
                            label={h.status}
                            tone={isReleased ? 'success' : isDisputed ? 'danger' : 'warning'}
                            dot
                          />
                          {h.disputeFrozen && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#f8e9e5] text-[#9a3f33] px-2 py-0.5 rounded-full border border-[#ebd0c9]">
                              <Lock className="w-3 h-3" /> Frozen
                            </span>
                          )}
                        </div>
                        {h.freezeReason && (
                          <div className="text-[10px] text-[#9a3f33] mt-0.5 max-w-xs truncate font-medium">
                            {h.freezeReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#73776f]">
                        {isReleased ? (
                          <span className="text-[#536b4a] font-medium">
                            Released {formatDateTime(h.releasedAt)}
                          </span>
                        ) : (
                          formatDateTime(h.releaseDueAt)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {formatMinor(h.amountMinor, h.currency)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {!isReleased && (
                          <>
                            <button
                              onClick={() => {
                                setActionHold(h);
                                setActionType('RELEASE');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] text-xs font-bold text-[#234b36] cursor-pointer"
                            >
                              Release
                            </button>
                            {h.disputeFrozen ? (
                              <button
                                onClick={() => {
                                  setActionHold(h);
                                  setActionType('UNFREEZE');
                                }}
                                className="px-2 py-1 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] text-xs font-bold text-[#3a302a] cursor-pointer"
                              >
                                Unfreeze
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActionHold(h);
                                  setActionType('FREEZE');
                                }}
                                className="px-2 py-1 rounded-lg border border-[#ebd0c9] bg-[#f8e9e5] hover:bg-rose-100 text-xs font-bold text-[#9a3f33] cursor-pointer"
                              >
                                Freeze
                              </button>
                            )}
                          </>
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
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#95631f]" />
            <p className="text-xs font-bold text-[#3a302a]">No escrow holds found</p>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      {actionHold && actionType && (
        <AdminDialog
          open={!!actionHold}
          onClose={() => {
            setActionHold(null);
            setActionType(null);
          }}
          title={
            actionType === 'RELEASE'
              ? 'Authorize Manual Escrow Release'
              : actionType === 'FREEZE'
              ? 'Dispute Freeze Escrow Hold'
              : 'Clear Dispute Freeze'
          }
          description={`Booking ${actionHold.bookingReference || actionHold.bookingId.slice(0, 8)} · Amount: ${formatMinor(actionHold.amountMinor, actionHold.currency)}`}
        >
          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">
                Audit Reason / Justification
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required operational justification for audit logs..."
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-3 text-xs text-[#3a302a] outline-none focus:border-[#b3541e]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => {
                  setActionHold(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#b3541e] hover:bg-[#934313] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {submitting ? 'Executing…' : 'Confirm Action'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
