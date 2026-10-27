'use client';

import React from 'react';
import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="w-full bg-[#F8F5ED] border-t border-[#E5E0D5]/60 py-12 px-6 lg:px-12 text-[#73776F] font-body">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Support */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Support</span>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Help Center
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              AirCover Protection
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Safety Information
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Cancellation Options
            </Link>
          </div>

          {/* Hosting */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Hosting</span>
            <Link href="/become-a-host" className="text-xs hover:text-[#234B36] transition-colors">
              Engida your home
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#234B36] transition-colors">
              Host Cover
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#234B36] transition-colors">
              Hosting Resources
            </Link>
            <Link href="/become-a-host" className="text-xs hover:text-[#234B36] transition-colors">
              Community Forum
            </Link>
          </div>

          {/* Discover */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Discover</span>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Curated Stays
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Architectural Sanctuaries
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Bole & Kazanchis
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Bishoftu & Lake Retreats
            </Link>
          </div>

          {/* Engida */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Engida</span>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              About Us
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Newsroom
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Careers
            </Link>
            <Link href="/" className="text-xs hover:text-[#234B36] transition-colors">
              Sustainability
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E0D5]/40 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Engida. All rights reserved.</span>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#234B36] transition-colors">
              Privacy
            </Link>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#234B36] transition-colors">
              Terms
            </Link>
            <span>&middot;</span>
            <Link href="/" className="hover:text-[#234B36] transition-colors">
              Sitemap
            </Link>
          </div>
          <p className="text-xs text-[#73776F]">
            Curated architectural accommodations across Ethiopia.
          </p>
        </div>
      </div>
    </footer>
  );
}
