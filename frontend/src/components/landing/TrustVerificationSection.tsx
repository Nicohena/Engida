'use client';

import React, { useState } from 'react';

const TRUST_PILLARS = [
  {
    id: 1,
    title: '1. National ID / Kebele & Passport KYC',
    srsCode: 'FR-01 & FR-02',
    description: 'Every host and guest identity is authenticated with official Ethiopian Kebele ID, Resident Permit, or International Passport before transaction access.',
    highlight: 'Zero Anonymous Listings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 2,
    title: '2. Physical On-Site & Amenity Inspection',
    srsCode: 'FR-03 & FR-04',
    description: 'Our team verifies GPS coordinates and physically audits essential amenities: automatic backup power generators, dedicated water reservoirs, and fiber WiFi.',
    highlight: 'Audited 24/7 Power & Water',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 3,
    title: '3. Verified-Only Reviews & Reputation',
    srsCode: 'FR-09',
    description: 'Strict cryptographic guarantee: reviews can only be submitted by travelers who physically checked into and completed an eligible booking.',
    highlight: '100% Zero Fake Reviews',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 4,
    title: '4. Multi-Signal Fraud & Escrow Engine',
    srsCode: 'FR-07 & FR-10',
    description: 'Real-time graph anomaly detection across User → Device → Payment. Guest funds are locked in secure escrow and released to the host only 24 hours after check-in.',
    highlight: '24-Hour Settlement Guard',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export default function TrustVerificationSection({ onExplore }: { onExplore?: () => void }) {
  const [activeTab, setActiveTab] = useState<number>(1);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>SRS FR-04, FR-10 & FR-16: Trust & Verification Framework</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          The 4 Pillars of Engida Trust
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          We built physical and algorithmic guardrails specifically designed for the Ethiopian hospitality landscape, ensuring complete safety for both travelers and property owners.
        </p>
      </div>

      {/* 4 Pillars Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {TRUST_PILLARS.map((pillar) => {
          const isSelected = activeTab === pillar.id;
          return (
            <div
              key={pillar.id}
              onClick={() => setActiveTab(pillar.id)}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#2563eb] bg-white shadow-lg ring-1 ring-[#2563eb]/30 scale-[1.01]'
                  : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {pillar.icon}
                  </div>
                  <span className="text-[10px] font-extrabold text-[#2563eb] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                    {pillar.srsCode}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {pillar.title}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {pillar.highlight}
                </span>
                <span className="text-[11px] font-semibold text-[#2563eb]">
                  Verified Standard →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Score Breakdown Box (SRS FR-04 Explainability Requirement) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Summary */}
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">
              <span>Explainable AI Trust Scoring (FR-04)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              How a Property Earns a 98%+ Trust Score
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every listing on Engida is evaluated by our multi-factor scoring model. No property can be published without meeting our baseline threshold.
            </p>
          </div>

          {/* Right Progress Gauges */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { label: 'Host Kebele / Passport KYC', weight: '25%', status: 'Audited & Verified' },
              { label: '24/7 Backup Generator Audit', weight: '25%', status: 'Tested On-Site' },
              { label: 'Dedicated Water Tank & Pump', weight: '20%', status: 'Functional Capacity' },
              { label: 'Verified Guest Stay History', weight: '20%', status: 'Completed Stays' },
              { label: 'Physical GPS Map Pinning', weight: '10%', status: 'Sub-City & Woreda' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">{item.label}</div>
                  <div className="text-[10px] text-emerald-400 font-medium">✓ {item.status}</div>
                </div>
                <span className="text-xs font-mono font-bold text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/20">
                  +{item.weight}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Explore Verified Stays CTA */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Complies with Ethiopian Electronic Transactions Proclamation & Data Protection standards.
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#2563eb] hover:bg-blue-600 text-white rounded-full text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            Browse Verified Accommodations
          </button>
        </div>

      </div>

    </div>
  );
}
