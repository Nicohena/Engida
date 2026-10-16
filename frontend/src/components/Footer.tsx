'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#F4F7FC] border-t border-[#CBD5E1] text-[#000000] py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#CBD5E1]">
          
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#33599E] flex items-center justify-center text-white">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[#000000] font-black text-xl tracking-tight">Engida</span>
            </Link>
            <p className="text-xs font-semibold text-[#334155]">
              Ethiopian Accommodation & Tourism Marketplace
            </p>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm font-bold text-[#000000]">
            <Link href="/" className="hover:text-[#33599E] transition">Home</Link>
            <Link href="#about" className="hover:text-[#33599E] transition">About</Link>
            <Link href="#features" className="hover:text-[#33599E] transition">Features</Link>
            <Link href="#contact" className="hover:text-[#33599E] transition">Contact</Link>
            <Link href="/login" className="hover:text-[#33599E] transition">Login</Link>
            <Link href="/register" className="hover:text-[#33599E] transition">Register</Link>
          </nav>
        </div>

        {/* Copyright */}
        <div className="pt-6 text-center text-xs font-semibold text-[#334155]">
          © {new Date().getFullYear()} Engida. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
