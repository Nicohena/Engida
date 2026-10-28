'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Scale,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import type { LedgerAccountItem, LedgerTransactionItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';

export default function LedgerTab() {
  const [accounts, setAccounts] = useState<LedgerAccountItem[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'ACCOUNTS' | 'TRANSACTIONS'>('ACCOUNTS');

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        apiFetch<LedgerAccountItem[]>('/admin/finance/ledger/accounts'),
        apiFetch<{ data: LedgerTransactionItem[] }>('/admin/finance/ledger/transactions?limit=25'),
      ]);
      setAccounts(accRes || []);
      setTransactions(txRes.data || []);
    } catch {
      setAccounts([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  const getTypeTone = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'success';
      case 'LIABILITY':
        return 'warning';
      case 'REVENUE':
        return 'accent';
      case 'EXPENSE':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Subtab Header */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex bg-[#faf5ee] p-1 rounded-xl border border-[#d8d0c8]">
          <button
            onClick={() => setActiveSubTab('ACCOUNTS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'ACCOUNTS'
                ? 'bg-white text-[#3a302a] shadow-xs'
                : 'text-[#73776f] hover:text-[#3a302a]'
            }`}
          >
            Chart of Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'TRANSACTIONS'
                ? 'bg-white text-[#3a302a] shadow-xs'
                : 'text-[#73776f] hover:text-[#3a302a]'
            }`}
          >
            Journal Entries & Transactions
          </button>
        </div>

        <button
          onClick={fetchLedgerData}
          className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {activeSubTab === 'ACCOUNTS' ? (
        /* Chart of Accounts */
        <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Normal Balance</th>
                    <th className="py-3 px-4 text-right">Derived Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#faf5ee]/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#b3541e]">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#3a302a]">
                        {acc.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AdminStatusBadge label={acc.type} tone={getTypeTone(acc.type)} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[#73776f]">
                        {acc.normalBalance}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {formatMinor(acc.balanceMinor, acc.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Double-entry Transactions */
        <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-[#faf5ee] animate-pulse rounded-xl" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="divide-y divide-[#f2ece4]">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-[#faf5ee]/40 transition space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#b3541e]">
                        {tx.transactionNumber}
                      </span>
                      <AdminStatusBadge label={tx.type} tone="accent" />
                      <span className="text-[#73776f] font-mono text-[11px]">
                        Ref: {tx.reference}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#73776f]">
                      {formatDateTime(tx.createdAt)}
                    </span>
                  </div>

                  <p className="text-[#3a302a] font-medium">{tx.description}</p>

                  {/* Debits and Credits line items */}
                  {tx.entries && tx.entries.length > 0 && (
                    <div className="bg-[#faf5ee] rounded-xl p-3 border border-[#d8d0c8] overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead>
                          <tr className="text-[#73776f] border-b border-[#d8d0c8] pb-1">
                            <th className="pb-1">Account</th>
                            <th className="pb-1">Direction</th>
                            <th className="pb-1 text-right">Debit</th>
                            <th className="pb-1 text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2ece4]">
                          {tx.entries.map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-1">
                                <span className="font-bold text-[#3a302a]">
                                  {entry.accountCode}
                                </span>{' '}
                                <span className="text-[#605850]">{entry.accountName}</span>
                              </td>
                              <td className="py-1 text-[#73776f]">{entry.direction}</td>
                              <td className="py-1 text-right font-bold text-[#3a302a]">
                                {entry.direction === 'DEBIT'
                                  ? formatMinor(entry.amountMinor, entry.currency)
                                  : '—'}
                              </td>
                              <td className="py-1 text-right font-bold text-[#3a302a]">
                                {entry.direction === 'CREDIT'
                                  ? formatMinor(entry.amountMinor, entry.currency)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#73776f]">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#b3541e]" />
              <p className="text-xs font-bold text-[#3a302a]">No journal entries posted yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
