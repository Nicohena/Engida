'use client';

import React from 'react';
import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="w-full bg-[#faf5ee] border-t border-[#d8d0c8]/60 py-12 px-6 lg:px-12 text-[#605850] font-body">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Support */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider">Support</span>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Help Center
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              AirCover Protection
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Safety Information
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Cancellation Options
            </Link>
          </div>

          {/* Hosting */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider">Hosting</span>
            <Link href="/become-a-host" className="text-xs hover:text-[#c2652a] transition-colors">
              Engida your home
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#c2652a] transition-colors">
              Host Cover
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#c2652a] transition-colors">
              Hosting Resources
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#c2652a] transition-colors">
              Community Forum
            </Link>
          </div>

          {/* Discover */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider">Discover</span>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Curated Stays
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Architectural Sanctuaries
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Bole & Kazanchis
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Bishoftu & Lake Retreats
            </Link>
          </div>

          {/* Engida */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider">Engida</span>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              About Us
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Newsroom
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Careers
            </Link>
            <Link href="/" className="text-xs hover:text-[#c2652a] transition-colors">
              Sustainability
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#d8d0c8]/40 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Engida. All rights reserved.</span>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#c2652a] transition-colors">
              Privacy
            </Link>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#c2652a] transition-colors">
              Terms
            </Link>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#c2652a] transition-colors">
              Sitemap
            </Link>
          </div>
          <p className="text-xs text-[#605850]">
            Curated architectural accommodations across Ethiopia.
          </p>
        </div>
      </div>
    </footer>
  );
}
