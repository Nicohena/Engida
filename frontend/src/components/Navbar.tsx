'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Building2, Menu, X, LogOut, User, KeyRound } from 'lucide-react';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '#explore', label: 'Explore' },
    { href: '#about', label: 'About' },
    { href: '#features', label: 'Features' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <header className="w-full bg-white border-b border-[#CBD5E1] text-[#000000] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Far Left: Engida Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#33599E] flex items-center justify-center text-white shadow-sm group-hover:bg-[#234079] transition">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[#000000] font-black text-2xl tracking-tight leading-none">
            Engida
          </span>
        </Link>

        {/* Center: Navigation Links (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#000000]">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-[#33599E] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Far Right: Auth Links / User Action */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <div className="h-9 w-24 bg-[#E3EAF5] animate-pulse rounded-lg"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-xs font-black bg-[#F4F7FC] hover:bg-[#E3EAF5] text-[#33599E] border border-[#CBD5E1] px-4 py-2 rounded-lg transition"
              >
                Dashboard ({user.name})
              </Link>
              <button
                onClick={() => logout()}
                className="text-xs font-bold text-red-600 hover:text-red-800 p-2 rounded-lg transition flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-black text-[#000000] hover:text-[#33599E] px-3 py-2 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-[#33599E] hover:bg-[#234079] text-white text-sm font-black px-5 py-2.5 rounded-lg transition shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#000000] hover:bg-[#F4F7FC] transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#CBD5E1] px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2 text-base font-bold text-[#000000]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#33599E] transition-colors border-b border-[#F4F7FC]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black text-[#33599E]"
                >
                  Dashboard ({user.name})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-black border border-[#CBD5E1] rounded-lg text-[#000000]"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-black bg-[#33599E] text-white rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
