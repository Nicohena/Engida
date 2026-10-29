'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Landmark,
  MapPin,
  Menu,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  Sliders,
  Star,
  Tag,
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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  permission?: Permission;
  anyOf?: Permission[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Overview',
    icon: LayoutDashboard,
    permission: ADMIN_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics & BI',
    icon: BarChart3,
    permission: ADMIN_PERMISSIONS.ANALYTICS_VIEW,
  },
  {
    href: '/admin/finance',
    label: 'Finance & Escrow',
    icon: Landmark,
    permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: CalendarRange,
    permission: ADMIN_PERMISSIONS.BOOKINGS_VIEW,
  },
  {
    href: '/admin/cases',
    label: 'Support cases',
    icon: MessagesSquare,
    permission: ADMIN_PERMISSIONS.CASES_VIEW,
  },
  {
    href: '/admin/users',
    label: 'Users & admins',
    icon: Users,
    permission: ADMIN_PERMISSIONS.USERS_VIEW,
  },
  {
    href: '/admin/moderation',
    label: 'Moderation',
    icon: ClipboardCheck,
    anyOf: [ADMIN_PERMISSIONS.LISTINGS_REVIEW, ADMIN_PERMISSIONS.HOSTS_VERIFY],
  },
  {
    href: '/admin/reviews',
    label: 'Guest reviews',
    icon: Star,
    permission: ADMIN_PERMISSIONS.REVIEWS_VIEW,
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: Flag,
    permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
  },
  {
    href: '/admin/categories',
    label: 'Categories & Locations',
    icon: MapPin,
    permission: ADMIN_PERMISSIONS.CATALOG_MANAGE,
  },
  {
    href: '/admin/coupons',
    label: 'Coupons & Discounts',
    icon: Tag,
    permission: ADMIN_PERMISSIONS.COUPONS_MANAGE,
  },
  {
    href: '/admin/content',
    label: 'Content & CMS',
    icon: FileText,
    permission: ADMIN_PERMISSIONS.CONTENT_MANAGE,
  },
  {
    href: '/admin/settings',
    label: 'Platform Settings',
    icon: Sliders,
    permission: ADMIN_PERMISSIONS.SETTINGS_VIEW,
  },
  {
    href: '/admin/system',
    label: 'System Health',
    icon: Activity,
    permission: ADMIN_PERMISSIONS.SYSTEM_VIEW,
  },
  {
    href: '/admin/audit',
    label: 'Audit log',
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
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

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
      <div className="admin-shell flex min-h-screen flex-col items-center justify-center bg-[#faf5ee]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8d0c8] bg-white shadow-[0_10px_30px_-18px_rgba(58,48,42,0.45)]">
          <span className="font-headline text-2xl font-bold text-[#b3541e]">E</span>
        </div>
        <div className="mt-5 h-px w-16 overflow-hidden bg-[#d8d0c8]">
          <span className="block h-full w-1/2 animate-pulse bg-[#b3541e]" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#605850]">
          Loading operations
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[#faf5ee] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#d8d0c8] bg-white p-8 text-center shadow-[0_20px_60px_-36px_rgba(58,48,42,0.4)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7e5dc] text-[#9a3f33]">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h1 className="font-headline text-2xl font-semibold tracking-[-0.015em] text-[#3a302a]">
            Administrator access required
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#605850]">
            This account does not have access to the ENGIDA operations console.
          </p>
          <Link href="/dashboard" className="admin-btn admin-btn-primary mt-6">
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
    <div className="flex h-full flex-col border-r border-[#d8d0c8] bg-[#f2ece4]">
      <div className="px-6 pb-6 pt-7">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="group inline-flex flex-col items-start"
        >
          <span className="font-headline text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#c2652a] transition-colors group-hover:text-[#e08850]">
            Engida
          </span>
          <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6c5d52]">
            Operations
          </span>
        </Link>
      </div>

      <div className="px-3">
        <div className="mb-3 flex items-center gap-3 px-3">
          <span className="h-px flex-1 bg-[#d8d0c8]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c5d52]">
            Workspace
          </span>
        </div>
        <nav className="space-y-1" aria-label="Admin console">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-[#b3541e] text-white shadow-[0_10px_24px_-16px_rgba(179,84,30,0.85)]'
                    : 'text-[#605850] hover:bg-[#eae2da] hover:text-[#3a302a]'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active
                      ? 'text-white'
                      : 'text-[#6c5d52] transition-colors group-hover:text-[#b3541e]'
                  }`}
                  strokeWidth={1.8}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-white/80" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-[#d8d0c8] bg-white/60 p-3">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eae2da] text-xs font-bold text-[#3a302a]">
              {initials || 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#3a302a]">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-[#78706a]">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#e6ddd2] pt-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-[#605850] transition-colors hover:text-[#b3541e]"
            >
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              View marketplace
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-[#605850] transition-colors hover:text-[#9a3f33]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen bg-[#faf5ee] text-[#3a302a]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-[#2f2722]/55 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[17rem] max-w-[86vw] shadow-[20px_0_60px_-30px_rgba(58,48,42,0.5)]">
            {sidebar}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d0c8] bg-[#faf5ee] text-[#3a302a] shadow-sm"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-[#d8d0c8] bg-[#faf5ee]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8d0c8] bg-white/60 text-[#3a302a] transition-colors hover:bg-[#f2ece4] lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="hidden text-xs font-semibold text-[#6c5d52] sm:inline">Admin</span>
              <span className="hidden text-[#c9bdb1] sm:inline">/</span>
              <span className="truncate text-[13px] font-semibold text-[#3a302a]">
                {activeItem?.label || 'Console'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2 rounded-full border border-[#d8d0c8] bg-white/65 px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b3541e]" />
                <span className="text-xs font-semibold text-[#605850]">{roleLabel}</span>
              </div>
              <Link
                href="/"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#d8d0c8] bg-white/65 text-[#605850] transition-colors hover:border-[#b3541e]/35 hover:text-[#b3541e] md:inline-flex"
                title="View marketplace"
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a302a] text-xs font-bold text-[#faf5ee]">
                {initials || 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
