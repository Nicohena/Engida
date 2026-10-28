'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  Landmark,
  Receipt,
  Clock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Wallet,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../context/AuthContext';
import { ADMIN_PERMISSIONS, can } from '../../../types/admin';
import { apiFetch, downloadAuthedFile } from '../../../lib/api';
import type { FinanceSummary } from '../../../types/admin-finance';

import OverviewTab from './components/overview-tab';
import PaymentsTab from './components/payments-tab';
import EscrowTab from './components/escrow-tab';
import RefundsTab from './components/refunds-tab';
import PayoutsTab from './components/payouts-tab';
import AccountsTab from './components/accounts-tab';
import LedgerTab from './components/ledger-tab';
import ReconciliationTab from './components/reconciliation-tab';
import SettingsTab from './components/settings-tab';

type FinanceTabKey =
  | 'overview'
  | 'payments'
  | 'escrow'
  | 'refunds'
  | 'payouts'
  | 'accounts'
  | 'ledger'
  | 'reconciliation'
  | 'settings';

export default function AdminFinancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceTabKey>('overview');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await apiFetch<FinanceSummary>('/admin/finance/summary');
      setSummary(data);
    } catch {
      // Summary fallback
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthedFile(
        '/admin/finance/export/transactions',
        `engida-finance-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (!can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_VIEW)) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#d8d0c8] max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-[#f8e9e5] text-[#9a3f33] flex items-center justify-center mx-auto mb-3">
          <Landmark className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold text-[#3a302a]">
          Finance Operations Access Required
        </h2>
        <p className="text-xs text-[#73776f] mt-1">
          Your administrator role does not have the <code className="font-mono">finance.view</code> permission.
        </p>
      </div>
    );
  }

  const TABS: Array<{ id: FinanceTabKey; label: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Treasury Overview', icon: Landmark },
    { id: 'payments', label: 'Captured Payments', icon: Receipt },
    {
      id: 'escrow',
      label: 'Escrow Holds',
      icon: Clock,
      count: summary?.pendingQueues?.frozenEscrowHolds,
    },
    {
      id: 'refunds',
      label: 'Refunds Review',
      icon: RotateCcw,
      count: summary?.pendingQueues?.pendingRefundApprovals,
    },
    {
      id: 'payouts',
      label: 'Host Payouts',
      icon: Wallet,
      count: summary?.pendingQueues?.pendingPayoutApprovals,
    },
    { id: 'accounts', label: 'Payout Accounts', icon: ShieldCheck },
    { id: 'ledger', label: 'General Ledger', icon: Scale },
    {
      id: 'reconciliation',
      label: 'Reconciliation',
      icon: FileCheck,
      count: summary?.pendingQueues?.reconciliationIssues,
    },
    { id: 'settings', label: 'Settings & Rates', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Escrow & Treasury Operations"
        description="Double-entry general ledger, provider escrow custody, and policy refund governance."
        actions={
          <div className="flex items-center gap-2">
            {can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_EXPORT) && (
              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-[#faf5ee] transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? 'Exporting…' : 'Export Ledger CSV'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main Finance Tab Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <nav className="flex space-x-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#b3541e] text-white shadow-xs'
                    : 'text-[#605850] hover:text-[#3a302a] hover:bg-[#faf5ee]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#73776f]'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#f7ebda] text-[#95631f] border border-[#ecd9c2]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Panel */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            summary={summary}
            loading={summaryLoading}
            onRefresh={fetchSummary}
            onNavigateTab={(tab) => setActiveTab(tab as FinanceTabKey)}
          />
        )}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'escrow' && <EscrowTab />}
        {activeTab === 'refunds' && <RefundsTab />}
        {activeTab === 'payouts' && <PayoutsTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'reconciliation' && <ReconciliationTab />}
        {activeTab === 'settings' && <SettingsTab onRefreshSummary={fetchSummary} />}
      </div>
    </div>
  );
}
