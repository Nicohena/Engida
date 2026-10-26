'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_PERMISSIONS,
  can,
  canAny,
  formatAdminRole,
  type Permission,
} from '../../types/admin';

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  anyOf?: Permission[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Overview',
    description: 'Operational snapshot',
    icon: LayoutDashboard,
    permission: ADMIN_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    href: '/admin/users',
    label: 'Users & admins',
    description: 'Accounts and access',
    icon: Users,
    permission: ADMIN_PERMISSIONS.USERS_VIEW,
  },
  {
    href: '/admin/moderation',
    label: 'Moderation',
    description: 'Listings and host checks',
    icon: ClipboardCheck,
    anyOf: [ADMIN_PERMISSIONS.LISTINGS_REVIEW, ADMIN_PERMISSIONS.HOSTS_VERIFY],
  },
  {
    href: '/admin/reviews',
    label: 'Guest reviews',
    description: 'Review moderation',
    icon: Star,
    permission: ADMIN_PERMISSIONS.REVIEWS_VIEW,
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    description: 'Trust and safety triage',
    icon: Flag,
    permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
  },
  {
    href: '/admin/audit',
    label: 'Audit log',
    description: 'Privileged action history',
    icon: ScrollText,
    permission: ADMIN_PERMISSIONS.AUDIT_VIEW,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleNav = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.permission) return can(user?.permissions, item.permission);
        if (item.anyOf) return canAny(user?.permissions, item.anyOf);
        return true;
      }),
    [user?.permissions],
  );

  const activeItem = visibleNav
    .filter((item) => (item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col items-center justify-center">
        <div className="w-11 h-11 rounded-full border-4 border-[#33599E] border-t-transparent animate-spin" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading admin console…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Administrator access required</h1>
          <p className="mt-2 text-sm text-slate-500">
            This account does not have access to the ENGIDA admin console.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#33599E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284A86] transition"
          >
            Return to your dashboard
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = user.adminRole ? formatAdminRole(user.adminRole) : 'Administrator';
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-200">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#33599E] flex items-center justify-center shadow-lg shadow-[#33599E]/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">ENGIDA</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Admin console</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-start gap-3 rounded-xl px-3 py-3 transition ${
                active
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-[#8FB3F5]' : ''}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-[11px] text-slate-500 group-hover:text-slate-400">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#33599E] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public site
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Open admin navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#33599E]">
                ENGIDA Operations
              </p>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeItem?.label || 'Admin console'}
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-600">{roleLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#33599E] text-white text-xs font-bold"
              aria-label="Account menu"
            >
              {initials || 'A'}
            </button>
            <div className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full bg-[#33599E] text-white text-xs font-bold">
              {initials || 'A'}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed bottom-5 right-5 z-50 lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
