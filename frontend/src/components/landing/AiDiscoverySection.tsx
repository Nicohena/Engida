'use client';

import React, { useState } from 'react';

const AI_PROMPTS = [
  {
    query: "A quiet 2-bedroom in Bole near Edna Mall with backup generator under 4,500 ETB",
    parsed: "Bole Atlas • 2-Bed • ≤4,500 ETB • 24/7 Generator • Fiber WiFi",
  },
  {
    query: "Lakeside family lodge in Hawassa with garden and lake view next weekend",
    parsed: "Hawassa Lakefront • 4 Guests • Lake View • Breakfast Included",
  },
  {
    query: "Executive studio near UNECA Kazanchis with dedicated workspace",
    parsed: "Kazanchis • 1-Bed • Dedicated Workspace • High-Speed WiFi",
  },
];

const DISCOVERY_CARDS = [
  {
    id: 0,
    title: 'Bole & Kazanchis Diplomatic',
    badge: 'Addis Ababa',
    price: 'From 3,500 ETB / night',
    description: 'Premier serviced suites and apartments with audited 24/7 generator backup, fiber WiFi, and 24-hour gated security.',
    renderIcon: (isActive: boolean) => (
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isActive ? '#ffffff' : '#2563eb'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-300"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    id: 1,
    title: 'Hawassa & Bishoftu Lakefront',
    badge: 'Resorts & Getaways',
    price: 'From 2,800 ETB / night',
    description: 'Serene lakeside villas and resort lodges with confirmed continuous water supply, lake views, and lush private gardens.',
    renderIcon: (isActive: boolean) => (
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isActive ? '#ffffff' : '#2563eb'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-300"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Lalibela & Northern Heritage',
    badge: 'Historic Wonders',
    price: 'From 3,200 ETB / night',
    description: 'Handpicked heritage guesthouses and mountain escarpment lodges near UNESCO rock churches with local guide support.',
    renderIcon: (isActive: boolean) => (
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isActive ? '#ffffff' : '#2563eb'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-300"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function AiDiscoverySection({ onCtaClick }: { onCtaClick?: () => void }) {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [activePromptIdx, setActivePromptIdx] = useState(0);

  return (
    <section className="w-full py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-slate-900 uppercase mb-3 sm:mb-4">
            INTELLIGENT DISCOVERY
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed">
            Search in natural language with our AI Assistant or explore verified Ethiopian hubs equipped with guaranteed power and water backup.
          </p>
        </div>

        {/* Interactive AI Prompt Banner */}
        <div className="max-w-3xl mx-auto mb-10 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              AI Natural-Language Intent Parser (FR-13)
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {AI_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePromptIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  activePromptIdx === idx
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                &ldquo;{p.query.split('near')[0].trim()}...&rdquo;
              </button>
            ))}
          </div>

          {/* Parsed Result Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-400 font-semibold">Matched:</span>
              <span className="font-bold text-slate-900 truncate">
                {AI_PROMPTS[activePromptIdx].parsed}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
              98% Match
            </span>
          </div>
        </div>

        {/* 3 Interactive Morphing Cards (Matching Exact Video Design & Animation) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center">
          {DISCOVERY_CARDS.map((card) => {
            const isActive = activeCard === card.id;

            return (
              <div
                key={card.id}
                onMouseEnter={() => setActiveCard(card.id)}
                onMouseLeave={() => setActiveCard(null)}
                className={`relative w-full max-w-[320px] min-h-[220px] sm:min-h-[240px] rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-500 ease-out select-none border ${
                  isActive
                    ? 'bg-[#2563eb] text-white border-[#2563eb] scale-[1.04] glow-blue z-20'
                    : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50/80 hover:scale-[1.02] z-10 shadow-2xs'
                }`}
              >
                {/* Icon Container */}
                <div className="mb-4 transform transition-transform duration-300">
                  {card.renderIcon(isActive)}
                </div>

                {/* Subtitle Badge */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#2563eb]'
                  }`}
                >
                  {card.badge}
                </span>

                {/* Title */}
                <h3
                  className={`text-base font-bold tracking-tight transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {card.title}
                </h3>

                <span
                  className={`text-xs font-semibold mt-1 transition-colors ${
                    isActive ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {card.price}
                </span>

                {/* Expanded Description (Exact Morphing Reveal from Video) */}
                <div
                  className={`overflow-hidden transition-all duration-400 ease-in-out ${
                    isActive
                      ? 'max-h-28 opacity-100 mt-3 transform translate-y-0'
                      : 'max-h-0 opacity-0 mt-0 transform translate-y-2 pointer-events-none'
                  }`}
                >
                  <p className="text-xs text-white/95 leading-relaxed max-w-[260px]">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Button */}
        <div className="mt-8 sm:mt-10 text-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="inline-flex items-center justify-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3.5 rounded-xl font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 glow-blue"
          >
            Explore Verified Stays
          </button>
        </div>

      </div>
    </section>
  );
}
