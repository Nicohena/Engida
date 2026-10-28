'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Landmark,
  ShieldCheck,
  Ban,
  Search,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import type { PayoutAccountListItem } from '../../../../types/admin-finance';
import { formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';

export default function AccountsTab() {
  const [accounts, setAccounts] = useState<PayoutAccountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: PayoutAccountListItem[] }>('/admin/finance/payout-accounts');
      setAccounts(res.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await apiFetch(`/admin/finance/payout-accounts/${id}/verify`, { method: 'POST' });
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleDisable = async (id: string) => {
    if (!confirm('Are you sure you want to disable this host payout account?')) return;
    try {
      await apiFetch(`/admin/finance/payout-accounts/${id}/disable`, { method: 'POST' });
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || 'Disable failed');
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.accountName.toLowerCase().includes(search.toLowerCase()) ||
      (a.bankName && a.bankName.toLowerCase().includes(search.toLowerCase())) ||
      a.accountNumberLast4.includes(search),
  );

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#73776f] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account holder, bank, last 4..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#faf5ee] border border-[#d8d0c8] rounded-xl text-xs font-medium text-[#3a302a] outline-none focus:border-[#b3541e]"
          />
        </div>

        <button
          onClick={fetchAccounts}
          className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Host / Holder</th>
                  <th className="py-3 px-4">Provider & Bank</th>
                  <th className="py-3 px-4">Account Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verified At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {filteredAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-[#faf5ee]/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#3a302a]">{a.accountName}</div>
                      <div className="text-[10px] text-[#73776f]">Host ID: {a.hostId.slice(0, 8)}…</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#3a302a]">{a.bankName || a.provider}</div>
                      {a.bankBranch && (
                        <div className="text-[10px] text-[#73776f]">Branch: {a.bankBranch}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#3a302a]">
                      •••• {a.accountNumberLast4}
                      {a.phoneLast4 && (
                        <span className="text-[10px] text-[#73776f] block font-normal">
                          Phone: •••• {a.phoneLast4}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AdminStatusBadge
                        label={a.status}
                        tone={
                          a.status === 'VERIFIED'
                            ? 'success'
                            : a.status === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }
                        dot
                      />
                    </td>
                    <td className="py-3 px-4 text-[#73776f] whitespace-nowrap">
                      {formatDateTime(a.verifiedAt)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {a.status !== 'VERIFIED' && a.status !== 'DISABLED' && (
                        <button
                          onClick={() => handleVerify(a.id)}
                          className="px-2.5 py-1 rounded-lg border border-[#d6dfcd] bg-[#edf1e8] hover:bg-emerald-100 text-xs font-bold text-[#536b4a] cursor-pointer"
                        >
                          Verify
                        </button>
                      )}
                      {a.status !== 'DISABLED' && (
                        <button
                          onClick={() => handleDisable(a.id)}
                          className="px-2 py-1 rounded-lg border border-[#ebd0c9] bg-[#f8e9e5] hover:bg-rose-100 text-xs font-bold text-[#9a3f33] cursor-pointer"
                        >
                          Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[#73776f]">
            <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#234b36]" />
            <p className="text-xs font-bold text-[#3a302a]">No payout accounts registered</p>
          </div>
        )}
      </div>
    </div>
  );
}
