'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  ADMIN_PERMISSIONS,
  can,
  type AuditLogEntry,
  type PaginatedAuditLogs,
} from '../../../types/admin';

const PAGE_SIZE = 25;

const ENTITY_TYPES = [
  { value: '', label: 'All entities' },
  { value: 'user', label: 'User account' },
  { value: 'property', label: 'Listing' },
  { value: 'listing_review', label: 'Listing review' },
  { value: 'host_profile', label: 'Host profile' },
  { value: 'review', label: 'Guest review' },
  { value: 'report', label: 'Report' },
];

interface Filters {
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  action: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toIsoStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function toIsoEnd(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59.999Z`).toISOString() : undefined;
}

function metadataReason(entry: AuditLogEntry): string | null {
  const reason = entry.metadata?.reason;
  return typeof reason === 'string' ? reason : null;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-xs text-slate-400">No data recorded.</p>;
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminAuditPage() {
  const { user } = useAuth();
  const canViewAudit = can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (!canViewAudit) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (applied.action.trim()) params.set('action', applied.action.trim());
        if (applied.entityType) params.set('entityType', applied.entityType);
        if (applied.entityId.trim()) params.set('entityId', applied.entityId.trim());
        const from = toIsoStart(applied.from);
        const to = toIsoEnd(applied.to);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const data = await apiFetch<PaginatedAuditLogs>(
          `/admin/audit-logs?${params.toString()}`,
        );
        if (cancelled) return;
        setEntries(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (page > data.totalPages) setPage(data.totalPages || 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load the audit log');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [canViewAudit, applied, page, refreshTick]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const hasFilters =
    Boolean(applied.action || applied.entityType || applied.entityId || applied.from || applied.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#33599E]">
            Accountability
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Audit log</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Append-only history of privileged actions. Credentials and session tokens are
            redacted before storage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((tick) => tick + 1)}
          disabled={loading || !canViewAudit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!canViewAudit ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your role does not include permission to view the audit log.
        </div>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label htmlFor="audit-action" className="text-[11px] font-bold text-slate-600">
                  Action
                </label>
                <input
                  id="audit-action"
                  value={draft.action}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, action: event.target.value }))
                  }
                  placeholder="e.g. user.suspend"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                />
              </div>

              <div>
                <label htmlFor="audit-entity" className="text-[11px] font-bold text-slate-600">
                  Entity type
                </label>
                <select
                  id="audit-entity"
                  value={draft.entityType}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, entityType: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="audit-entity-id" className="text-[11px] font-bold text-slate-600">
                  Entity ID
                </label>
                <input
                  id="audit-entity-id"
                  value={draft.entityId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, entityId: event.target.value }))
                  }
                  placeholder="UUID or reference"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="audit-from" className="text-[11px] font-bold text-slate-600">
                    From
                  </label>
                  <input
                    id="audit-from"
                    type="date"
                    value={draft.from}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, from: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                  />
                </div>
                <div>
                  <label htmlFor="audit-to" className="text-[11px] font-bold text-slate-600">
                    To
                  </label>
                  <input
                    id="audit-to"
                    type="date"
                    value={draft.to}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, to: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#33599E] px-3 text-sm font-semibold text-white hover:bg-[#284A86]"
                >
                  <Filter className="h-4 w-4" />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters && !draft.action && !draft.entityType && !draft.entityId && !draft.from && !draft.to}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load the audit log</p>
                <p className="mt-0.5 text-rose-600">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefreshTick((tick) => tick + 1)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      When
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Actor
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Entity
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Context
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && entries.length === 0
                    ? Array.from({ length: 7 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    : entries.map((entry) => {
                        const reason = metadataReason(entry);
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                {formatDateTime(entry.createdAt)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-slate-800">
                                {entry.actorEmail || 'System'}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {entry.actorRole || 'automated'}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#33599E]/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#33599E]">
                                <ShieldCheck className="h-3 w-3" />
                                {entry.action}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-slate-700">
                                {entry.entityType}
                              </p>
                              {entry.entityId && (
                                <p className="mt-0.5 max-w-[180px] truncate font-mono text-[10px] text-slate-400">
                                  {entry.entityId}
                                </p>
                              )}
                            </td>
                            <td className="max-w-[260px] px-5 py-4">
                              {reason ? (
                                <p className="truncate text-xs text-slate-600" title={reason}>
                                  {reason}
                                </p>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                              {entry.ipAddress && (
                                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                                  {entry.ipAddress}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelected(entry)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#33599E] hover:bg-[#33599E]/5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {!loading && entries.length === 0 && !error && (
              <div className="px-6 py-14 text-center">
                <ScrollText className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-base font-bold text-slate-700">No audit entries</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {hasFilters
                    ? 'No entries match these filters.'
                    : 'Privileged actions will be recorded here as your team works.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Page {page} of {totalPages} · {total.toLocaleString()} entr
                {total === 1 ? 'y' : 'ies'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close audit details"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setSelected(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="audit-detail-title" className="text-base font-bold text-slate-900">
                  Audit entry
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(selected.createdAt)} · {selected.action}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Actor
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selected.actorEmail || 'System'}
                  </p>
                  <p className="text-xs text-slate-500">{selected.actorRole || 'automated'}</p>
                  {selected.actorId && (
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                      {selected.actorId}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Entity
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selected.entityType}
                  </p>
                  {selected.entityId && (
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                      {selected.entityId}
                    </p>
                  )}
                  {selected.ipAddress && (
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      IP {selected.ipAddress}
                    </p>
                  )}
                </div>
              </div>

              {metadataReason(selected) && (
                <div>
                  <p className="text-xs font-bold text-slate-700">Reason</p>
                  <p className="mt-1.5 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {metadataReason(selected)}
                  </p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-700">Before</p>
                  <JsonBlock value={selected.beforeState} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-700">After</p>
                  <JsonBlock value={selected.afterState} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-bold text-slate-700">Metadata</p>
                <JsonBlock value={selected.metadata} />
              </div>

              {selected.userAgent && (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-700">User agent</p>
                  <p className="break-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] text-slate-500">
                    {selected.userAgent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
