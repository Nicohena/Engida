'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  GatewayStatus,
  ScheduledJobInfo,
  SystemHealthOverview,
} from '../../../types/admin-system';

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemHealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SystemHealthOverview>('/admin/system/health');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch system diagnostic metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleTriggerJob = async (jobName: string) => {
    setTriggeringJob(jobName);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await apiFetch<any>(`/admin/system/jobs/${jobName}/run`, {
        method: 'POST',
      });
      setActionSuccess(`Job "${jobName}" completed successfully with status: ${res.status}`);
      await fetchHealth();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || `Failed to execute background job "${jobName}"`);
    } finally {
      setTriggeringJob(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Monitoring & System Administration"
        description="Real-time operational health, PostgreSQL database connection latency, background cron job registry, and external gateway statuses."
        actions={
          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white text-[#605850] shadow-sm transition hover:bg-[#eae2da] hover:text-[#3a302a]"
            title="Refresh diagnostics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#b3541e]' : ''}`} />
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Global Status Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative flex h-5 w-5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                data?.overallStatus === 'OPERATIONAL'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex h-5 w-5 rounded-full ${
                data?.overallStatus === 'OPERATIONAL'
                  ? 'bg-emerald-600'
                  : 'bg-amber-600'
              }`}
            />
          </span>
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-[#3a302a]">
              {data?.overallStatus === 'OPERATIONAL'
                ? 'All Systems Fully Operational'
                : 'Degraded Performance Detected'}
            </h2>
            <p className="text-xs text-[#78706a]">
              Diagnostic snapshot at {data ? new Date(data.timestamp).toLocaleString() : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-[#f6f0e8] px-3 py-1.5 text-[#b3541e]">
            DB Ping: {data?.database.pingMs ?? 0} ms
          </span>
          <span className="rounded-lg bg-[#f6f0e8] px-3 py-1.5 text-[#605850]">
            Uptime: {data?.runtime.uptimeFormatted ?? '—'}
          </span>
        </div>
      </div>

      {/* Database & Runtime Diagnostics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PostgreSQL Database Health */}
        <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f0e8] text-[#b3541e]">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                  PostgreSQL Data Store
                </h3>
                <p className="text-xs text-[#78706a]">
                  Database: {data?.database.databaseName || 'engida_db'}
                </p>
              </div>
            </div>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                data?.database.status === 'HEALTHY'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {data?.database.status || 'CHECKING'}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Total Users</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                {data?.database.tableCounts.users ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Properties</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                {data?.database.tableCounts.properties ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Bookings</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                {data?.database.tableCounts.bookings ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Ledger Entries</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#b3541e]">
                {data?.database.tableCounts.ledgerEntries ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Audit Logs</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                {data?.database.tableCounts.auditLogs ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
              <p className="text-[11px] font-bold text-[#78706a]">Open Tickets</p>
              <p className="mt-1 font-headline text-2xl font-bold text-[#b3541e]">
                {data?.database.tableCounts.openCases ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Node.js Runtime Engine */}
        <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f0e8] text-[#b3541e]">
                <Cpu className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                  Node.js Application Runtime
                </h3>
                <p className="text-xs text-[#78706a]">
                  Engine: {data?.runtime.nodeVersion} ({data?.runtime.platform})
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              {data?.runtime.environment.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#3a302a]">
                <span>Heap Memory Used</span>
                <span>
                  {data?.runtime.memory.heapUsedMb} MB / {data?.runtime.memory.heapTotalMb} MB
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#f2ece4]">
                <div
                  className="h-full rounded-full bg-[#b3541e]"
                  style={{
                    width: `${Math.min(
                      Math.round(
                        ((data?.runtime.memory.heapUsedMb || 1) /
                          (data?.runtime.memory.heapTotalMb || 1)) *
                          100,
                      ),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                <p className="text-[11px] font-bold text-[#78706a]">RSS Resident Memory</p>
                <p className="mt-1 font-headline text-xl font-bold text-[#3a302a]">
                  {data?.runtime.memory.rssMb} MB
                </p>
              </div>
              <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                <p className="text-[11px] font-bold text-[#78706a]">External Memory</p>
                <p className="mt-1 font-headline text-xl font-bold text-[#3a302a]">
                  {data?.runtime.memory.externalMb} MB
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Background Jobs Registry */}
      <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="font-headline text-xl font-semibold text-[#3a302a]">
              Scheduled Background Jobs & Automation
            </h3>
            <p className="text-xs text-[#78706a]">
              Automated financial clearing, double-entry invariant verification, and SLA ticket escalators
            </p>
          </div>
          <Clock className="h-5 w-5 text-[#b3541e]" />
        </div>

        <div className="divide-y divide-[#f2ece4]">
          {data?.jobs.map((job) => (
            <div
              key={job.name}
              className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-base font-semibold text-[#3a302a]">
                    {job.name}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      job.lastStatus === 'SUCCEEDED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : job.lastStatus === 'RUNNING'
                          ? 'bg-amber-100 text-amber-800'
                          : job.lastStatus === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {job.lastStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#78706a]">{job.description}</p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-[#9a9088]">
                  <span>Cadence: {job.schedule}</span>
                  <span>•</span>
                  <span>
                    Last Run:{' '}
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerJob(job.name)}
                disabled={triggeringJob === job.name}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-bold text-[#3a302a] shadow-sm transition hover:bg-[#eae2da] hover:text-[#b3541e] disabled:opacity-50 sm:self-auto"
              >
                <Play
                  className={`h-3.5 w-3.5 text-[#b3541e] ${
                    triggeringJob === job.name ? 'animate-spin' : ''
                  }`}
                />
                {triggeringJob === job.name ? 'Running...' : 'Run Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* External Gateway Statuses */}
      <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="font-headline text-xl font-semibold text-[#3a302a]">
              External Integration Gateways
            </h3>
            <p className="text-xs text-[#78706a]">
              Active connectivity with third-party payment, CDN, and telecom providers
            </p>
          </div>
          <Zap className="h-5 w-5 text-[#b3541e]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data?.gateways.map((gw) => (
            <div
              key={gw.name}
              className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-4 transition hover:border-[#b3541e]/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3a302a]">{gw.name}</span>
                <span
                  className={`flex h-2.5 w-2.5 rounded-full ${
                    gw.status === 'OPERATIONAL' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-[#78706a]">{gw.mode}</p>
              <p className="mt-1 font-mono text-[10px] text-[#9a9088] truncate">{gw.endpoint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
