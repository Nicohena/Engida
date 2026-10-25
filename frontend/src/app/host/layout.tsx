'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  CalendarRange,
  BadgeDollarSign,
  Star,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import NotificationHub from '../../components/host/NotificationHub';

// ──────────────────────────────────────────────────
// Navigation items for the host sidebar
// ──────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    href: '/host/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/host/listings',
    label: 'Listings',
    icon: ListTodo,
  },
  {
    href: '/host/reservations',
    label: 'Reservations',
    icon: CalendarDays,
  },
  {
    href: '/host/earnings',
    label: 'Earnings',
    icon: BadgeDollarSign,
  },
  {
    href: '/host/reviews',
    label: 'Reviews',
    icon: Star,
  },
  {
    href: '/host/availability',
    label: 'Availability',
    icon: CalendarRange,
  },
];

// ──────────────────────────────────────────────────
// Sidebar component (shared desktop + mobile drawer)
// ──────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A] border-r border-slate-800 text-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-500 transition">
            <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white leading-none block">
              Engida
            </span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
              Host Portal
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationHub variant="icon" />
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/host/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 font-semibold'
              }`}
            >
              <Icon
                className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
              />
              <span className="text-sm flex-1">{item.label}</span>
              {isActive && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  active
                </span>
              )}
            </Link>
          );
        })}

        {/* Notifications Nav Item */}
        <div className="pt-1.5 border-t border-slate-800/60 mt-2">
          <NotificationHub variant="sidebar-item" />
        </div>
      </nav>

      {/* Divider + User + Links */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2.5">
        {/* Public site link */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition text-xs font-semibold"
          onClick={onClose}
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          <span>View Public Site</span>
        </Link>

        {/* User profile card & account hub */}
        {user && (
          <div className="bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-2.5 flex items-center gap-2.5 group transition">
            <Link
              href="/host/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 flex-1 min-w-0"
              title="Host Account & Profile Settings"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0 uppercase group-hover:scale-105 transition-transform">
                {user.name ? user.name.charAt(0) : 'H'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-snug group-hover:text-blue-400 transition-colors">
                  {user.name}
                </p>
                <p className="text-[11px] font-medium text-slate-400 truncate">
                  Account & Settings
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition shrink-0" />
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Host Layout — wraps all /host/* pages
// Auth check: redirect unauthenticated users to /login
// ──────────────────────────────────────────────────
export default function HostLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!user && !loading) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/host/dashboard')}`);
    }
  }, [user, loading, pathname, router]);

  React.useEffect(() => {
    if (user && !loading) {
      if (pathname === '/host/onboarding' && user.hostProfile) {
        router.replace('/host/dashboard');
      } else if (pathname !== '/host/onboarding' && !user.hostProfile) {
        router.replace('/host/onboarding');
      }
    }
  }, [user, loading, pathname, router]);

  // While auth is resolving, show a minimal loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#33599E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#64748B]">Loading host portal…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Render onboarding without sidebar
  if (pathname === '/host/onboarding') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F7FC]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 md:hidden h-full">
            <SidebarContent onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-slate-800 text-white flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="font-black text-base tracking-tight text-white">Engida</span>
          </div>
          <NotificationHub variant="icon" />
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
