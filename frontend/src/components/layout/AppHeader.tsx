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
    <header className="sticky top-0 z-40 w-full bg-[#faf5ee]/95 backdrop-blur-xl border-b border-[#d8d0c8]/50 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <span className="text-3xl font-bold tracking-tight text-[#c2652a] font-headline transition-colors group-hover:text-[#e08850]">
            Engida
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/become-a-host"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#f2ece4] text-[#3a302a] font-semibold text-sm hover:bg-[#c2652a] hover:text-white transition-all duration-200 active:scale-95 shadow-xs font-body"
          >
            Become a Host
          </Link>

          <button
            type="button"
            aria-label="Toggle currency"
            onClick={() => setCurrency((c) => (c === 'USD' ? 'ETB' : 'USD'))}
            title={`Currency: ${currency}. Click to toggle`}
            className="hidden md:flex items-center justify-center px-3 py-1.5 rounded-full hover:bg-[#f2ece4] text-xs font-bold text-[#605850] hover:text-[#c2652a] transition font-body"
          >
            {currency}
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="User menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border border-[#d8d0c8]/60 shadow-[0_2px_12px_rgba(58,48,42,0.06)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.14)] hover:border-[#c2652a]/40 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#605850] text-base">menu</span>
              <div className="w-8 h-8 rounded-full bg-[#f2ece4] flex items-center justify-center p-1 overflow-hidden text-[#a84d16] font-bold text-xs">
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <span className="material-symbols-outlined text-lg text-[#605850]">person</span>
                )}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#d8d0c8]/60 py-2 z-50 animate-fade-in-up font-body">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-[#d8d0c8]/40">
                      <p className="text-xs text-[#605850]">Signed in as</p>
                      <p className="text-sm font-bold text-[#3a302a] truncate">{user.name || user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#3a302a] hover:bg-[#faf5ee] hover:text-[#c2652a] font-medium"
                    >
                      Dashboard
                    </Link>
                    {user.hostProfile ? (
                      <Link
                        href="/host/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#3a302a] hover:bg-[#faf5ee] hover:text-[#c2652a] font-medium"
                      >
                        Host Dashboard
                      </Link>
                    ) : (
                      <Link
                        href="/become-a-host"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#3a302a] hover:bg-[#faf5ee] hover:text-[#c2652a] font-medium"
                      >
                        Become a Host
                      </Link>
                    )}
                    <div className="my-1 border-t border-[#d8d0c8]/40" />
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
                      className="block px-4 py-2.5 text-sm text-[#3a302a] hover:bg-[#faf5ee] hover:text-[#c2652a] font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#605850] hover:bg-[#faf5ee] hover:text-[#c2652a] font-medium"
                    >
                      Create Account
                    </Link>
                    <div className="my-1 border-t border-[#d8d0c8]/40" />
                    <Link
                      href="/become-a-host"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#605850] hover:bg-[#faf5ee] hover:text-[#c2652a] font-medium"
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
