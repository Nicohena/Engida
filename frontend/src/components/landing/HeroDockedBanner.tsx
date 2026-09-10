'use client';

import React from 'react';

export default function HeroDockedBanner() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="bg-[#2563eb] rounded-t-2xl sm:rounded-t-3xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20 text-white py-5 sm:py-6 px-4">
          
          {/* Item 1: 100% Verified Stays */}
          <div className="flex items-center justify-center gap-3 py-3 md:py-1 px-4 group hover:bg-white/5 transition-colors rounded-lg">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="text-sm sm:text-base font-medium tracking-wide">
              100% Verified Stays
            </span>
          </div>

          {/* Item 2: Telebirr & Local Banks */}
          <div className="flex items-center justify-center gap-3 py-3 md:py-1 px-4 group hover:bg-white/5 transition-colors rounded-lg">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="12" cy="15" r="2" />
              </svg>
            </div>
            <span className="text-sm sm:text-base font-medium tracking-wide">
              Telebirr & Local Banks
            </span>
          </div>

          {/* Item 3: Escrow Guest Protection */}
          <div className="flex items-center justify-center gap-3 py-3 md:py-1 px-4 group hover:bg-white/5 transition-colors rounded-lg">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </div>
            <span className="text-sm sm:text-base font-medium tracking-wide">
              Escrow Guest Protection
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
