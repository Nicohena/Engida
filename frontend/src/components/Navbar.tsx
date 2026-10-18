'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Building2, Menu, X, LogOut, User, Sparkles, Luggage, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="w-10 h-10 rounded-xl bg-[#1e40af] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1e3a8a] transition">
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
              className="hover:text-[#1e40af] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Far Right: Auth Links / User Action */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 bg-[#E3EAF5] animate-pulse rounded-lg"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Host Portal / Become a Host CTA */}
              <Link
                href={user.hostProfile ? '/host/dashboard' : '/become-a-host'}
                className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-[#1e40af] to-[#2563eb] hover:from-[#1d4ed8] hover:to-[#1e40af] shadow-xs hover:shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{user.hostProfile ? 'Host Portal' : 'Become a Host'}</span>
              </Link>

              {/* User Profile Dropdown Pill */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-xs bg-white text-slate-800 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1e40af] to-[#3b82f6] text-white text-xs font-black flex items-center justify-center uppercase shadow-2xs">
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {user.name ? user.name.split(' ')[0] : 'Account'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-partition">
                    {/* User Profile Summary */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1e40af] to-[#3b82f6] text-white text-sm font-black flex items-center justify-center uppercase shadow-xs shrink-0">
                          {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900 truncate leading-snug">
                            {user.name}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {user.hostProfile && (
                        <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-wider text-[#1e40af]">
                          <Building2 className="w-3 h-3" />
                          <span>Host Partner</span>
                        </div>
                      )}
                    </div>

                    {/* Navigation Links with clear distinction */}
                    <div className="py-1">
                      {/* 1. Host Portal */}
                      <Link
                        href={user.hostProfile ? '/host/dashboard' : '/become-a-host'}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-start gap-3 px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 hover:text-[#1e40af] transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1e40af] flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-none">
                            {user.hostProfile ? 'Host Portal' : 'Become a Host'}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 mt-1">
                            {user.hostProfile ? 'Manage listings, calendar & rates' : 'Earn income by hosting guests'}
                          </p>
                        </div>
                      </Link>

                      {/* 2. My Trips & Bookings */}
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-start gap-3 px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 hover:text-[#1e40af] transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Luggage className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-none">
                            My Trips & Stays
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 mt-1">
                            Reservations you booked as a guest
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50/70 transition cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-black text-[#000000] hover:text-[#1e40af] px-3 py-2 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-black bg-[#1e40af] text-white hover:bg-[#1e3a8a] px-4 py-2 rounded-xl transition shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#000000] p-2 hover:bg-[#F4F7FC] rounded-lg transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#CBD5E1] bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold text-[#000000] hover:text-[#1e40af] py-1 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                <div className="px-2 py-1">
                  <p className="text-xs font-black text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
                <Link
                  href={user.hostProfile ? '/host/dashboard' : '/become-a-host'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-[#1e40af]"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{user.hostProfile ? 'Host Portal' : 'Become a Host'}</span>
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-700"
                >
                  <Luggage className="w-4 h-4" />
                  <span>My Trips & Stays</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-red-600"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-sm font-black border border-[#CBD5E1] py-2.5 rounded-lg hover:bg-[#F4F7FC] transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-sm font-black bg-[#1e40af] text-white py-2.5 rounded-lg hover:bg-[#1e3a8a] transition shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
