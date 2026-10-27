'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import HostAvatar from '../../components/host/HostAvatar';
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
    <div className="flex flex-col h-full bg-[#1A2E21] border-r border-[#252923] text-[#EEF3EF]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#252923]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#234B36] flex items-center justify-center text-white shadow-xs group-hover:bg-[#2D5E43] transition">
            <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-headline font-bold text-lg tracking-tight text-white leading-none block">
              Engida
            </span>
            <span className="text-[10px] font-bold text-[#2D5E43] uppercase tracking-widest leading-none">
              Host Portal
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationHub variant="icon" />
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-[#E5E0D5] hover:text-white hover:bg-white/10 transition"
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
                  ? 'bg-[#234B36]/20 text-[#2D5E43] font-bold border border-[#234B36]/40 shadow-xs'
                  : 'text-[#E5E0D5]/80 hover:text-white hover:bg-white/5 font-semibold'
              }`}
            >
              <Icon
                className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-[#2D5E43]' : 'text-[#E5E0D5]/70'}`}
              />
              <span className="text-sm flex-1">{item.label}</span>
              {isActive && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#234B36]/30 text-[#EEF3EF] border border-[#234B36]/40">
                  active
                </span>
              )}
            </Link>
          );
        })}

        {/* Notifications Nav Item */}
        <div className="pt-1.5 border-t border-[#252923]/60 mt-2">
          <NotificationHub variant="sidebar-item" />
        </div>
      </nav>

      {/* Divider + User + Links */}
      <div className="px-3 py-4 border-t border-[#252923] space-y-2.5">
        {/* Public site link */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#E5E0D5]/80 hover:text-white hover:bg-white/5 transition text-xs font-semibold"
          onClick={onClose}
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#E5E0D5]/70" />
          <span>View Public Site</span>
        </Link>

        {/* User profile card & account hub */}
        {user && (
          <div className="bg-[#1a1513] border border-[#252923] hover:border-[#234B36]/60 rounded-2xl p-2.5 flex items-center gap-2.5 group transition">
            <Link
              href="/host/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 flex-1 min-w-0"
              title="Host Account & Profile Settings"
            >
              <HostAvatar
                src={user.avatar}
                name={user.name}
                size={36}
                className="rounded-xl ring-1 ring-white/10 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-snug group-hover:text-[#2D5E43] transition-colors">
                  {user.name}
                </p>
                <p className="text-[11px] font-medium text-[#E5E0D5]/70 truncate">
                  Account & Settings
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#73776F] group-hover:text-[#2D5E43] transition shrink-0" />
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#E5E0D5]/70 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5ED]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#234B36] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#73776F]">Loading host portal…</p>
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
    <div className="flex h-screen overflow-hidden bg-[#F8F5ED] selection:bg-[#234B36]/20 selection:text-[#234B36]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-xs"
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1A2E21] border-b border-[#252923] text-white flex-shrink-0 shadow-xs">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-[#E5E0D5] hover:text-white hover:bg-white/10 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#234B36] flex items-center justify-center text-white">
              <Building2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="font-headline font-bold text-base tracking-tight text-white">Engida</span>
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
