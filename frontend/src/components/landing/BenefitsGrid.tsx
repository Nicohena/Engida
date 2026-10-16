'use client';

import React, { useState } from 'react';

export default function BenefitsGrid() {
  const [activeId, setActiveId] = useState<number | null>(null);

  const benefits = [
    {
      id: 0,
      title: 'Verified Trust Scores',
      description: 'Multi-signal KYC and on-site physical inspection for 100% genuine property listings.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 1,
      title: 'Direct ETB Payments',
      description: 'Pay securely using Telebirr, CBE Birr, and local banks with zero foreign exchange fees.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Guaranteed Power & Water',
      description: 'Confirmed 24/7 backup generator and dedicated water tank capacity on all verified stays.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeWidth="2" />
          <path d="M9 9h.01" strokeWidth="3" />
          <path d="M15 15h.01" strokeWidth="3" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'AI Search Concierge',
      description: 'Natural language accommodation matching converts your requests into instant bookings.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <polyline points="4 8 10 4 14 8 20 2" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Dynamic Host Yield',
      description: 'Automated seasonal pricing suggestions keep your property occupied with maximized revenue.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      ),
    },
    {
      id: 5,
      title: 'Escrow Settlement Lock',
      description: 'Protected payments in escrow, releasing host payouts 24 hours after successful check-in.',
      renderIcon: (isActive: boolean) => (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#ffffff' : '#1e293b'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        >
          <circle cx="12" cy="12" r="10" />
          <path
            d="M8 12l3 3 5-6"
            className="animate-check"
            strokeWidth="2.2"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full py-20 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-slate-900 uppercase">
            MORE BENEFITS
          </h2>
        </div>

        {/* 2x3 Grid Container (Exact visual structure from video) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 items-center justify-items-center">
          {benefits.map((benefit) => {
            const isActive = activeId === benefit.id;

            return (
              <div
                key={benefit.id}
                onMouseEnter={() => setActiveId(benefit.id)}
                onMouseLeave={() => setActiveId(null)}
                className={`relative w-full max-w-[290px] min-h-[190px] sm:min-h-[210px] rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-500 ease-out select-none ${
                  isActive
                    ? 'bg-[#2563eb] text-white scale-[1.04] glow-blue z-20'
                    : 'bg-transparent text-slate-800 hover:bg-slate-50/80 hover:scale-[1.02] z-10'
                }`}
              >
                {/* Icon Container */}
                <div className="mb-4 transform transition-transform duration-300">
                  {benefit.renderIcon(isActive)}
                </div>

                {/* Title */}
                <h3
                  className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {benefit.title}
                </h3>

                {/* Expanded Description (Morphing Reveal) */}
                <div
                  className={`overflow-hidden transition-all duration-400 ease-in-out ${
                    isActive
                      ? 'max-h-24 opacity-100 mt-3 transform translate-y-0'
                      : 'max-h-0 opacity-0 mt-0 transform translate-y-2 pointer-events-none'
                  }`}
                >
                  <p className="text-xs sm:text-[13px] text-white/95 leading-relaxed max-w-[240px]">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
