'use client';

import React from 'react';

export default function PropertyDetailsFooter() {
  return (
    <footer className="bg-[#1e2738] text-slate-300 pt-16 pb-12 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Footer Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-700/60">
          {/* Left Brand and Mission */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-white font-serif">engida</span>
              <span className="h-2 w-2 rounded-full bg-slate-400 mb-1" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Engida is dedicated to delivering bespoke architectural properties and exceptional real estate advisory services through international standards of excellence and market expertise.
            </p>
            {/* Newsletter */}
            <div className="pt-4 max-w-md">
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2" htmlFor="newsletter-email-detail">
                Stay Updated
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Subscribe for latest property listings, market insights, and exclusive invitations to real estate showcases.
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded text-xs px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  id="newsletter-email-detail"
                  placeholder="Enter your email"
                  type="email"
                />
                <button
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded transition uppercase tracking-wider"
                  type="button"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          {/* Company */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a className="hover:text-white transition-colors" href="#">About Us</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Properties</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Agents</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Careers</a></li>
            </ul>
          </div>
          {/* Explore */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a className="hover:text-white transition-colors" href="#">Market Insights</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Recent News</a></li>
              <li><a className="hover:text-white transition-colors" href="#">FAQ</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Engida Real Estate. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a className="hover:text-slate-400" href="#">Terms of Service</a>
            <a className="hover:text-slate-400" href="#">Privacy Notice</a>
            <a className="hover:text-slate-400" href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
