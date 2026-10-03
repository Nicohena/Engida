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
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

// ──────────────────────────────────────────────────
// Navigation items for the host sidebar
// ──────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    href: '/host/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    active: true,
  },
  {
    href: '/host/listings',
    label: 'Listings',
    icon: ListTodo,
    active: false,   // placeholder — implemented in Step 5B
  },
  {
    href: '/host/reservations',
    label: 'Reservations',
    icon: CalendarDays,
    active: false,   // placeholder — implemented in Step 5C
  },
  {
    href: '/host/availability',
    label: 'Availability',
    icon: CalendarRange,
    active: false,   // placeholder — implemented in Step 5D
  },
  {
    href: '/host/profile',
    label: 'Profile',
    icon: UserCircle,
    active: false,   // placeholder — implemented in Step 5E
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
    <div className="flex flex-col h-full bg-white border-r border-[#CBD5E1]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#CBD5E1]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#33599E] flex items-center justify-center text-white shadow-sm group-hover:bg-[#234079] transition">
            <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-[#000000] leading-none block">
              Engida
            </span>
            <span className="text-[10px] font-semibold text-[#33599E] uppercase tracking-widest leading-none">
              Host Portal
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-[#F4F7FC] transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isDisabled = !item.active && item.href !== '/host/dashboard';

          if (isDisabled) {
            return (
              <div
                key={item.href}
                title="Coming soon"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#94A3B8] cursor-not-allowed select-none"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold flex-1">{item.label}</span>
                <span className="text-[10px] font-bold bg-[#F4F7FC] text-[#94A3B8] border border-[#CBD5E1] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#E3EAF5] text-[#33599E] font-bold'
                  : 'text-[#334155] hover:bg-[#F4F7FC] font-semibold'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#33599E]' : 'text-[#64748B]'}`}
              />
              <span className="text-sm flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-[#33599E]" />}
            </Link>
          );
        })}
      </nav>

      {/* Divider + User + Links */}
      <div className="px-3 py-4 border-t border-[#CBD5E1] space-y-2">
        {/* Public site link */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#64748B] hover:bg-[#F4F7FC] transition text-sm font-semibold"
          onClick={onClose}
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Public Site</span>
        </Link>

        {/* User info + logout */}
        {user && (
          <div className="bg-[#F4F7FC] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#33599E] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#000000] truncate">{user.name}</p>
              <p className="text-xs text-[#64748B] truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition flex-shrink-0"
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

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  // Redirect logic based on hostProfile
  React.useEffect(() => {
    if (user && !loading) {
      if (pathname === '/host/onboarding' && user.hostProfile) {
        router.push('/host/dashboard');
      } else if (pathname !== '/host/onboarding' && !user.hostProfile) {
        router.push('/host/onboarding');
      }
    }
  }, [user, loading, pathname, router]);

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
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#CBD5E1] flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-[#334155] hover:bg-[#F4F7FC] transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#33599E] flex items-center justify-center text-white">
              <Building2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="font-black text-base tracking-tight text-[#000000]">Engida</span>
          </div>
          <div className="w-9" /> {/* spacer for centering */}
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
