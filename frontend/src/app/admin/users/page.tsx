'use client';

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_OPTIONS,
  can,
  formatAdminRole,
  type AdminRole,
  type AdminUser,
  type AdminUserDetail,
  type PaginatedAdminUsers,
} from '../../../types/admin';

type RoleFilter = 'all' | 'USER' | 'ADMIN';
type StatusFilter = 'all' | 'active' | 'suspended';

const PAGE_SIZE = 20;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function hostStatusClasses(status: string): string {
  switch (status) {
    case 'VERIFIED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function hostStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

function Modal({ open, onClose, title, description, children, footer, wide }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="admin-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const canViewUsers = can(user?.permissions, ADMIN_PERMISSIONS.USERS_VIEW);
  const canManageUsers = can(user?.permissions, ADMIN_PERMISSIONS.USERS_MANAGE);
  const canManageAdmins = can(user?.permissions, ADMIN_PERMISSIONS.ADMINS_MANAGE);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<{
    q: string;
    role: RoleFilter;
    status: StatusFilter;
    page: number;
  }>({ q: '', role: 'all', status: 'all', page: 1 });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [roleValue, setRoleValue] = useState<AdminRole | 'NONE' | ''>('');
  const [roleReason, setRoleReason] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    adminRole: 'PROPERTY_MODERATOR' as AdminRole,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const activeParam = params.get('isActive');

    setFilters((current) => ({
      ...current,
      role: roleParam === 'ADMIN' || roleParam === 'USER' ? roleParam : 'all',
      status:
        activeParam === 'false' ? 'suspended' : activeParam === 'true' ? 'active' : 'all',
    }));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.q === searchInput ? current : { ...current, q: searchInput, page: 1 },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(filters.page));
        params.set('limit', String(PAGE_SIZE));
        if (filters.q.trim()) params.set('q', filters.q.trim());
        if (filters.role !== 'all') params.set('role', filters.role);
        if (filters.status !== 'all') {
          params.set('isActive', String(filters.status === 'active'));
        }

        const data = await apiFetch<PaginatedAdminUsers>(`/admin/users?${params.toString()}`);
        if (cancelled) return;
        setUsers(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (filters.page > data.totalPages) {
          setFilters((current) => ({ ...current, page: data.totalPages || 1 }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load users');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, filters, refreshTick]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await apiFetch<AdminUserDetail>(`/admin/users/${id}`);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load this account');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openStatusDialog = (target: AdminUser) => {
    setStatusTarget(target);
    setStatusReason('');
    setStatusError(null);
  };

  const openRoleDialog = (target: AdminUser) => {
    setRoleTarget(target);
    setRoleValue(target.adminRole || '');
    setRoleReason('');
    setRoleError(null);
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    if (statusReason.trim().length < 5) {
      setStatusError('Add a short reason (at least 5 characters).');
      return;
    }

    setStatusSubmitting(true);
    setStatusError(null);
    const nextActive = !statusTarget.isActive;
    try {
      await apiFetch(`/admin/users/${statusTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive, reason: statusReason.trim() }),
      });
      setToast({
        type: 'success',
        message: `${statusTarget.name} was ${nextActive ? 'reactivated' : 'suspended'}.`,
      });
      setStatusTarget(null);
      setDetailOpen(false);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not update the account');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const changeRole = async () => {
    if (!roleTarget || !roleValue) {
      setRoleError('Choose an admin role or remove admin access.');
      return;
    }
    if (roleReason.trim().length < 5) {
      setRoleError('Add a short reason (at least 5 characters).');
      return;
    }

    setRoleSubmitting(true);
    setRoleError(null);
    try {
      await apiFetch(`/admin/users/${roleTarget.id}/admin-role`, {
        method: 'PATCH',
        body: JSON.stringify({
          adminRole: roleValue === 'NONE' ? null : roleValue,
          reason: roleReason.trim(),
        }),
      });
      setToast({
        type: 'success',
        message:
          roleValue === 'NONE'
            ? `${roleTarget.name} no longer has admin access.`
            : `${roleTarget.name} is now ${formatAdminRole(roleValue)}.`,
      });
      setRoleTarget(null);
      setDetailOpen(false);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Could not update admin access');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const createAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    if (createForm.password.length < 12) {
      setCreateError('Use a password with at least 12 characters.');
      return;
    }
    if (
      !/[a-z]/.test(createForm.password) ||
      !/[A-Z]/.test(createForm.password) ||
      !/\d/.test(createForm.password)
    ) {
      setCreateError('Password must include lower-case, upper-case and numeric characters.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await apiFetch<AdminUser>('/admin/admins', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setCreatedAdmin(created);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        adminRole: 'PROPERTY_MODERATOR',
      });
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the admin account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (filters.status === 'suspended') return 'Suspended accounts';
    if (filters.status === 'active') return 'Active accounts';
    return 'All accounts';
  }, [filters.status]);

  const resetFilters = () => {
    setSearchInput('');
    setFilters({ q: '', role: 'all', status: 'all', page: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#33599E]">
            Account operations
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Users & administrators
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Search every account, review host status and manage console access. Account
            suspensions revoke active refresh tokens.
          </p>
        </div>
        {canManageAdmins && (
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setCreatedAdmin(null);
              setCreateError(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#33599E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#284A86] transition"
          >
            <UserPlus className="h-4 w-4" />
            Create admin
          </button>
        )}
      </div>

      {!canViewUsers ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your role does not include permission to view user accounts.
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_170px_170px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search name, email or phone"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                />
              </div>

              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as RoleFilter,
                    page: 1,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                aria-label="Filter by account type"
              >
                <option value="all">All account types</option>
                <option value="USER">Guests & hosts</option>
                <option value="ADMIN">Administrators</option>
              </select>

              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as StatusFilter,
                    page: 1,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              <div className="flex items-center justify-between gap-2 lg:justify-end">
                <span className="text-xs font-semibold text-slate-500">
                  {total.toLocaleString()} result{total === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setRefreshTick((tick) => tick + 1)}
                  disabled={loading}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Refresh users"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {(filters.q || filters.role !== 'all' || filters.status !== 'all') && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Active filters:</span>
                {filters.q && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    “{filters.q}”
                  </span>
                )}
                {filters.role !== 'all' && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    {filters.role === 'ADMIN' ? 'Administrators' : 'Guests & hosts'}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  {statusLabel}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-bold text-[#33599E] hover:text-[#284A86]"
                >
                  Clear all
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load accounts</p>
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
                      Account
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Access
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Host check
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && users.length === 0
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                                <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    : users.map((account) => (
                        <tr key={account.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {account.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={account.avatar}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#33599E]/10 text-xs font-bold text-[#33599E]">
                                  {initials(account.name) || '?'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {account.name}
                                  </p>
                                  {account.id === user?.id && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-slate-500">{account.email}</p>
                                {account.phone && (
                                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                    <Phone className="h-3 w-3" />
                                    {account.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {account.role === 'ADMIN' ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#33599E]/20 bg-[#33599E]/5 px-2.5 py-1 text-[11px] font-bold text-[#33599E]">
                                  <ShieldCheck className="h-3 w-3" />
                                  {account.adminRole
                                    ? formatAdminRole(account.adminRole)
                                    : 'Administrator'}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                <Users className="h-3 w-3" />
                                Guest / host
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {account.hostProfile ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${hostStatusClasses(
                                  account.hostProfile.verificationStatus,
                                )}`}
                              >
                                <BadgeCheck className="h-3 w-3" />
                                {hostStatusLabel(account.hostProfile.verificationStatus)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Not a host</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                account.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  account.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {account.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-500">
                            {formatDate(account.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(account.id)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#33599E] hover:bg-[#33599E]/5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                              {canManageAdmins && account.id !== user?.id && (
                                <button
                                  type="button"
                                  onClick={() => openRoleDialog(account)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                  title="Change admin access"
                                  aria-label={`Change admin access for ${account.name}`}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                              )}
                              {canManageUsers &&
                                (account.role !== 'ADMIN' || canManageAdmins) &&
                                account.id !== user?.id && (
                                <button
                                  type="button"
                                  onClick={() => openStatusDialog(account)}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                                    account.isActive
                                      ? 'text-rose-500 hover:bg-rose-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={account.isActive ? 'Suspend account' : 'Reactivate account'}
                                  aria-label={
                                    account.isActive
                                      ? `Suspend ${account.name}`
                                      : `Reactivate ${account.name}`
                                  }
                                >
                                  {account.isActive ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!loading && users.length === 0 && !error && (
              <div className="px-6 py-14 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-base font-bold text-slate-700">No accounts found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing the search or filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Page {filters.page} of {totalPages} · {total.toLocaleString()} account
                {total === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                  disabled={filters.page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.min(totalPages, current.page + 1),
                    }))
                  }
                  disabled={filters.page >= totalPages || loading}
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

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Account details"
        description="Profile, host status and activity counts."
        wide
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            {detail && canManageAdmins && detail.id !== user?.id && (
              <button
                type="button"
                onClick={() => openRoleDialog(detail)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#33599E]/20 bg-[#33599E]/5 px-3 py-2 text-sm font-semibold text-[#33599E] hover:bg-[#33599E]/10"
              >
                <KeyRound className="h-4 w-4" />
                Admin access
              </button>
            )}
            {detail &&
              canManageUsers &&
              (detail.role !== 'ADMIN' || canManageAdmins) &&
              detail.id !== user?.id && (
              <button
                type="button"
                onClick={() => openStatusDialog(detail)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                  detail.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {detail.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {detail.isActive ? 'Suspend account' : 'Reactivate account'}
              </button>
            )}
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#33599E]" />
            <p className="mt-2 text-sm font-medium">Loading account…</p>
          </div>
        ) : detailError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Could not load account</p>
            <p className="mt-1">{detailError}</p>
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {detail.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.avatar}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#33599E]/10 text-lg font-bold text-[#33599E]">
                  {initials(detail.name) || '?'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{detail.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      detail.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {detail.isActive ? 'Active' : 'Suspended'}
                  </span>
                  {detail.role === 'ADMIN' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#33599E]/20 bg-[#33599E]/5 px-2.5 py-1 text-[11px] font-bold text-[#33599E]">
                      <ShieldCheck className="h-3 w-3" />
                      {detail.adminRole ? formatAdminRole(detail.adminRole) : 'Administrator'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {detail.email}
                  </span>
                  {detail.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {detail.phone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    Joined {formatDate(detail.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Listings', value: detail.counts.properties, icon: Building2 },
                { label: 'Guest bookings', value: detail.counts.bookingsAsGuest, icon: Users },
                { label: 'Host bookings', value: detail.counts.bookingsAsHost, icon: BadgeCheck },
                { label: 'Reviews written', value: detail.counts.reviews, icon: Star },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {metric.value.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">{metric.label}</p>
                  </div>
                );
              })}
            </div>

            {detail.hostProfile && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Host profile</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {detail.hostProfile.displayName || 'No display name'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${hostStatusClasses(
                      detail.hostProfile.verificationStatus,
                    )}`}
                  >
                    {hostStatusLabel(detail.hostProfile.verificationStatus)}
                  </span>
                </div>
                {detail.hostProfile.phone && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    {detail.hostProfile.phone}
                  </p>
                )}
              </div>
            )}

            {detail.role === 'ADMIN' && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-800">Effective permissions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.permissions?.length ? (
                    detail.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-600"
                      >
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No admin permissions.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.isActive ? 'Suspend account' : 'Reactivate account'}
        description={
          statusTarget
            ? `${statusTarget.name} · ${statusTarget.email}`
            : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              disabled={statusSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={changeStatus}
              disabled={statusSubmitting || statusReason.trim().length < 5}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                statusTarget?.isActive
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {statusSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : statusTarget?.isActive ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {statusTarget?.isActive ? 'Suspend account' : 'Reactivate account'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {statusTarget?.isActive ? (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The account will lose access immediately. Active refresh tokens are revoked.
                The user&apos;s public listings are not automatically removed; hide them from
                moderation if needed.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>The account will be able to sign in again with its existing credentials.</p>
            </div>
          )}

          <div>
            <label htmlFor="status-reason" className="text-xs font-bold text-slate-700">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="status-reason"
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What happened? This is written to the audit log."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Minimum 5 characters</span>
              <span>{statusReason.length}/500</span>
            </div>
          </div>

          {statusError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {statusError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title="Admin access"
        description={
          roleTarget ? `${roleTarget.name} · ${roleTarget.email}` : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRoleTarget(null)}
              disabled={roleSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={changeRole}
              disabled={roleSubmitting || !roleValue || roleReason.trim().length < 5}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#33599E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#284A86] disabled:opacity-50"
            >
              {roleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Save access
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-role" className="text-xs font-bold text-slate-700">
              Admin role <span className="text-rose-500">*</span>
            </label>
            <select
              id="admin-role"
              value={roleValue}
              onChange={(event) => setRoleValue(event.target.value as AdminRole | 'NONE' | '')}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
            >
              <option value="" disabled>
                Choose a role
              </option>
              {ADMIN_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="NONE">Remove admin access</option>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Super Admin manages administrators and access. Property Moderator verifies hosts
              and moderates listings. Support Agent manages user accounts and resolves reports.
              Booking and Finance roles have focused, view-only access.
            </p>
          </div>

          <div>
            <label htmlFor="role-reason" className="text-xs font-bold text-slate-700">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="role-reason"
              value={roleReason}
              onChange={(event) => setRoleReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why is this access change needed?"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Minimum 5 characters</span>
              <span>{roleReason.length}/500</span>
            </div>
          </div>

          {roleError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {roleError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreatedAdmin(null);
          setCreateError(null);
        }}
        title="Create administrator"
        description="The account is created immediately with the selected role."
        footer={
          createdAdmin ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setCreatedAdmin(null);
                }}
                className="rounded-xl bg-[#33599E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#284A86]"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-admin-form"
                disabled={createSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#33599E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#284A86] disabled:opacity-50"
              >
                {createSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create admin
              </button>
            </div>
          )
        }
      >
        {createdAdmin ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Administrator created</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {createdAdmin.name} ({createdAdmin.email}) now has the{' '}
                  {formatAdminRole(createdAdmin.adminRole)} role.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Share the password with the administrator through a secure channel. They can sign
              in from the normal login page. Their access is recorded in the audit log.
            </p>
          </div>
        ) : (
          <form id="create-admin-form" onSubmit={createAdmin} className="space-y-4">
            <div>
              <label htmlFor="admin-name" className="text-xs font-bold text-slate-700">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-name"
                required
                minLength={2}
                maxLength={120}
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, name: event.target.value }))
                }
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                placeholder="e.g. Selam Tesfaye"
              />
            </div>

            <div>
              <label htmlFor="admin-email" className="text-xs font-bold text-slate-700">
                Work email <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, email: event.target.value }))
                }
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                placeholder="name@engida.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="text-xs font-bold text-slate-700">
                Temporary password <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, password: event.target.value }))
                }
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
                placeholder="At least 12 characters"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Include upper-case, lower-case and numeric characters. Share it securely; it is
                not shown again.
              </p>
            </div>

            <div>
              <label htmlFor="new-admin-role" className="text-xs font-bold text-slate-700">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="new-admin-role"
                value={createForm.adminRole}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    adminRole: event.target.value as AdminRole,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#33599E] focus:bg-white focus:ring-2 focus:ring-[#33599E]/15"
              >
                {ADMIN_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {createError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {createError}
              </p>
            )}
          </form>
        )}
      </Modal>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-white text-emerald-800'
              : 'border-rose-200 bg-white text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          <p className="font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 rounded p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
