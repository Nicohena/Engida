'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'ETB'>('ETB');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F5ED]/95 backdrop-blur-xl border-b border-[#E5E0D5]/50 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <span className="text-3xl font-bold tracking-tight text-[#234B36] font-headline transition-colors group-hover:text-[#2D5E43]">
            Engida
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/become-a-host"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#EEF3EF] text-[#252923] font-semibold text-sm hover:bg-[#234B36] hover:text-white transition-all duration-200 active:scale-95 shadow-xs font-body"
          >
            Become a Host
          </Link>

          <button
            type="button"
            aria-label="Toggle currency"
            onClick={() => setCurrency((c) => (c === 'USD' ? 'ETB' : 'USD'))}
            title={`Currency: ${currency}. Click to toggle`}
            className="hidden md:flex items-center justify-center px-3 py-1.5 rounded-full hover:bg-[#EEF3EF] text-xs font-bold text-[#73776F] hover:text-[#234B36] transition font-body"
          >
            {currency}
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="User menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border border-[#E5E0D5]/60 shadow-[0_2px_12px_rgba(58,48,42,0.06)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.14)] hover:border-[#234B36]/40 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#73776F] text-base">menu</span>
              <div className="w-8 h-8 rounded-full bg-[#EEF3EF] flex items-center justify-center p-1 overflow-hidden text-[#a84d16] font-bold text-xs">
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <span className="material-symbols-outlined text-lg text-[#73776F]">person</span>
                )}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E5E0D5]/60 py-2 z-50 animate-fade-in-up font-body">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-[#E5E0D5]/40">
                      <p className="text-xs text-[#73776F]">Signed in as</p>
                      <p className="text-sm font-bold text-[#252923] truncate">{user.name || user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Dashboard
                    </Link>
                    {user.hostProfile ? (
                      <Link
                        href="/host/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                      >
                        Host Dashboard
                      </Link>
                    ) : (
                      <Link
                        href="/become-a-host"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                      >
                        Become a Host
                      </Link>
                    )}
                    <div className="my-1 border-t border-[#E5E0D5]/40" />
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Create Account
                    </Link>
                    <div className="my-1 border-t border-[#E5E0D5]/40" />
                    <Link
                      href="/become-a-host"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Engida your home
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
