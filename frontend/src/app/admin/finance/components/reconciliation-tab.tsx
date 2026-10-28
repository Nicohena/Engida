'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import type { ReconciliationIssueItem } from '../../../../types/admin-finance';
import { formatMinor, formatDateTime } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import AdminDialog from '../../../../components/admin/AdminDialog';

export default function ReconciliationTab() {
  const [issues, setIssues] = useState<ReconciliationIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Settlement import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProvider, setImportProvider] = useState('CHAPA');
  const [rawSettlementData, setRawSettlementData] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Resolution modal state
  const [selectedIssue, setSelectedIssue] = useState<ReconciliationIssueItem | null>(null);
  const [resolutionAction, setResolutionAction] = useState('MATCH');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiFetch<{ data: ReconciliationIssueItem[] }>(
        `/admin/finance/reconciliation/issues?${params.toString()}`,
      );
      setIssues(res.data || []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const handleImportSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      let records = [];
      try {
        records = JSON.parse(rawSettlementData);
      } catch {
        // If not json, create simulated report
        records = [
          {
            transactionReference: rawSettlementData.trim() || 'SAMPLE-REF-001',
            providerTransactionId: 'CHAPA-SIM-999',
            amountMinor: '150000',
            status: 'success',
            paidAt: new Date().toISOString(),
          },
        ];
      }

      const res = await apiFetch<any>('/admin/finance/reconciliation/settlement-report', {
        method: 'POST',
        body: JSON.stringify({
          provider: importProvider,
          reportReference: `REP-${Date.now()}`,
          records,
        }),
      });

      setImportResult(`Settlement processed: ${res.matchedCount} matched, ${res.issuesCreatedCount} discrepancy issue(s) flagged.`);
      fetchIssues();
    } catch (err: any) {
      setImportResult(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setResolving(true);

    try {
      await apiFetch(`/admin/finance/reconciliation/issues/${selectedIssue.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          action: resolutionAction,
          notes: resolutionNotes || 'Resolved per ops check',
        }),
      });

      setSelectedIssue(null);
      setResolutionNotes('');
      fetchIssues();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve issue');
    } finally {
      setResolving(false);
    }
  };

  const getSeverityTone = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#605850]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a302a]"
          >
            <option value="ALL">All Issues</option>
            <option value="DETECTED">Detected (Unresolved)</option>
            <option value="RESOLVED">Resolved</option>
            <option value="INVESTIGATING">Investigating</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#234b36] hover:bg-[#1a3828] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Settlement</span>
          </button>
          <button
            onClick={fetchIssues}
            className="p-2 border border-[#d8d0c8] bg-white rounded-xl hover:bg-[#faf5ee] text-[#3a302a] cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#faf5ee] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : issues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#d8d0c8] text-[#73776f] font-bold uppercase tracking-wider bg-[#faf5ee]">
                  <th className="py-3 px-4">Detected</th>
                  <th className="py-3 px-4">Type & Severity</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Discrepancy</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ece4] text-[#3a302a]">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-[#faf5ee]/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-[#73776f]">
                      {formatDateTime(issue.detectedAt)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#3a302a]">{issue.type}</div>
                      <div className="mt-0.5">
                        <AdminStatusBadge
                          label={issue.severity}
                          tone={getSeverityTone(issue.severity)}
                          dot
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-medium text-[#3a302a] leading-tight">
                        {issue.description}
                      </p>
                      {issue.resolutionNotes && (
                        <p className="text-[10px] text-[#536b4a] mt-0.5 font-mono">
                          Notes: {issue.resolutionNotes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#73776f]">
                      {issue.externalReference || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AdminStatusBadge
                        label={issue.status}
                        tone={issue.status === 'RESOLVED' ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      {issue.discrepancyMinor ? formatMinor(issue.discrepancyMinor) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {issue.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="px-2.5 py-1 rounded-lg border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] text-xs font-bold text-[#b3541e] cursor-pointer"
                        >
                          Resolve
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
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#536b4a]" />
            <p className="text-xs font-bold text-[#3a302a]">All payments fully reconciled</p>
            <p className="text-[11px] text-[#73776f] mt-0.5">
              Zero mismatched amounts or unmapped gateway captures detected.
            </p>
          </div>
        )}
      </div>

      {/* Import Settlement Modal */}
      {showImportModal && (
        <AdminDialog
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Provider Settlement Report"
          description="Feed external gateway statement lines to verify and match against ledger captures."
        >
          <form onSubmit={handleImportSettlement} className="space-y-4 text-xs">
            {importResult && (
              <div className="p-3 bg-[#edf1e8] border border-[#d6dfcd] rounded-xl text-[#536b4a] font-bold">
                {importResult}
              </div>
            )}

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">Payment Provider</label>
              <select
                value={importProvider}
                onChange={(e) => setImportProvider(e.target.value)}
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 font-medium"
              >
                <option value="CHAPA">Chapa Financial Technologies</option>
                <option value="TELEBIRR">Telebirr (Ethio Telecom)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">
                Settlement Data (JSON array or single Transaction Reference)
              </label>
              <textarea
                required
                rows={4}
                value={rawSettlementData}
                onChange={(e) => setRawSettlementData(e.target.value)}
                placeholder='e.g. [{"transactionReference":"ENGIDA-CHAPA-...","amountMinor":"120000","status":"success"}] or single ref'
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-3 font-mono text-[11px]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={importing}
                className="px-4 py-2 bg-[#234b36] hover:bg-[#1a3828] text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {importing ? 'Processing…' : 'Run Settlement Reconciliation'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}

      {/* Resolve Issue Modal */}
      {selectedIssue && (
        <AdminDialog
          open={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title="Resolve Reconciliation Discrepancy"
          description={`Issue ID: ${selectedIssue.id.slice(0, 8)} · Type: ${selectedIssue.type}`}
        >
          <form onSubmit={handleResolveIssue} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#3a302a] mb-1">Resolution Action</label>
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 font-medium"
              >
                <option value="MATCH">Matched & Verified (Clear Discrepancy)</option>
                <option value="CHARGEBACK">Recognize Provider Chargeback</option>
                <option value="MANUAL_ADJUSTMENT">Post Manual Ledger Adjustment</option>
                <option value="IGNORE">Ignore (False Positive)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#3a302a] mb-1">Resolution Notes</label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain why this discrepancy was resolved..."
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-3 text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolving}
                className="px-4 py-2 bg-[#b3541e] hover:bg-[#934313] text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {resolving ? 'Saving…' : 'Mark Resolved'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
