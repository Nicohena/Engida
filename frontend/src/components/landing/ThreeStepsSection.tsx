'use client';

import React, { useState } from 'react';

export default function ThreeStepsSection({ onCtaClick }: { onCtaClick?: () => void }) {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: 0,
      title: 'Establish Criteria',
      description:
        'Select your Ethiopian destination, dates, and must-have backup power & water. Our AI matches your exact stay.',
      renderIllustration: () => (
        <div className="w-28 h-28 mx-auto flex items-center justify-center relative">
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
            {/* Inbox / Scanner Tray */}
            <path
              d="M10 50 L25 50 L32 64 L68 64 L75 50 L90 50 L84 82 L16 82 Z"
              fill="#2563eb"
            />
            <path
              d="M8 50 L25 50 L32 64 L68 64 L75 50 L92 50"
              stroke="#1d4ed8"
              strokeWidth="2"
            />
            {/* Document Paper Sheet */}
            <rect x="26" y="12" width="48" height="52" rx="3" fill="#ffffff" stroke="#93c5fd" strokeWidth="2" />
            {/* Document Lines */}
            <line x1="34" y1="24" x2="66" y2="24" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="34" y1="32" x2="58" y2="32" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="34" y1="40" x2="62" y2="40" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" />
            {/* Blue Checkmark on Paper */}
            <circle cx="50" cy="50" r="8" fill="#dbeafe" />
            <path d="M46 50 L49 53 L55 47" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ),
    },
    {
      id: 1,
      title: 'Select Verified Stay',
      description:
        'Choose comfortably from verified homes, serviced apartments, and lodges with confirmed 24/7 generator and WiFi.',
      renderIllustration: () => (
        <div className="w-28 h-28 mx-auto flex items-center justify-center relative">
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
            {/* Outer Target Pulsing Ring */}
            <circle cx="50" cy="45" r="34" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Avatar Circle Container */}
            <circle cx="50" cy="45" r="26" fill="#1e293b" />
            {/* User Head & Body */}
            <circle cx="50" cy="38" r="9" fill="#ffffff" />
            <path d="M34 58 C34 49, 41 47, 50 47 C59 47, 66 49, 66 58 Z" fill="#ffffff" />
            {/* Verified Badge Checkmark in Bright Cyan / Blue */}
            <circle cx="68" cy="30" r="10" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
            <path d="M64.5 30 L67 32.5 L72 27.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Instant Escrow Booking',
      description:
        'Pay effortlessly in ETB with Telebirr, CBE, or card. Funds are held in escrow until 24 hours after your successful check-in.',
      renderIllustration: () => (
        <div className="w-28 h-28 mx-auto flex items-center justify-center relative">
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
            {/* Modern Residential Apartment Block */}
            <rect x="36" y="16" width="46" height="66" rx="2" fill="#2563eb" />
            {/* Roof accent */}
            <rect x="42" y="10" width="34" height="6" rx="1" fill="#1d4ed8" />
            {/* Apartment Windows Grid (White lit windows) */}
            <rect x="44" y="24" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="56" y="24" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="68" y="24" width="8" height="8" rx="1" fill="#ffffff" />

            <rect x="44" y="38" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="56" y="38" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="68" y="38" width="8" height="8" rx="1" fill="#ffffff" />

            <rect x="44" y="52" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="56" y="52" width="8" height="8" rx="1" fill="#ffffff" />
            <rect x="68" y="52" width="8" height="8" rx="1" fill="#ffffff" />

            {/* Entrance Door */}
            <rect x="55" y="68" width="10" height="14" rx="1" fill="#0f172a" />

            {/* Green Tree next to building */}
            <rect x="23" y="60" width="4" height="22" rx="1" fill="#78350f" />
            <circle cx="25" cy="52" r="14" fill="#22c55e" />
            <circle cx="21" cy="46" r="8" fill="#16a34a" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <section className="w-full py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-slate-900 uppercase mb-3 sm:mb-4">
            3 EASY STEPS
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed">
            Establish your requirements, find your perfect verified stay, and book securely with ease. We streamline the entire journey from search to guaranteed check-in.
          </p>
        </div>

        {/* 3-Step Card Container (Exact original video design) */}
        <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {steps.map((step) => {
              const isSelected = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  onMouseEnter={() => setActiveStep(step.id)}
                  className={`relative p-8 sm:p-10 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${
                    isSelected ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Top Illustration */}
                  <div className="mb-6 transform transition-transform duration-300 group-hover:scale-105">
                    {step.renderIllustration()}
                  </div>

                  {/* Step Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[260px]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Active Step Blue Highlight Line along the Bottom Container */}
          <div className="w-full h-1 bg-slate-100 relative">
            <div
              className="absolute top-0 bottom-0 bg-[#2563eb] transition-all duration-500 ease-out"
              style={{
                width: '33.333%',
                left: `${activeStep * 33.333}%`,
              }}
            />
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="mt-8 sm:mt-10 text-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="inline-flex items-center justify-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3.5 rounded-xl font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 glow-blue"
          >
            Find Stays Now
          </button>
        </div>

      </div>
    </section>
  );
}
