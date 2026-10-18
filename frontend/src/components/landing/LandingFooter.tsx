'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="w-full bg-white border-t border-slate-100 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 text-sm tracking-tight">Engida <span className="text-[#2563eb] text-xs">እንግዳ</span></span>
          <span>Copyright {new Date().getFullYear()} Engida</span>
        </div>
        <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center">
          <Link href="/host/onboarding" className="hover:text-slate-600 transition-colors">Host portal</Link>
          <Link href="/properties" className="hover:text-slate-600 transition-colors">Browse listings</Link>
          <Link href="/login" className="hover:text-slate-600 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
