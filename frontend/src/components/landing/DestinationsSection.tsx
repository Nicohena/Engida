'use client';

import React from 'react';

interface DestinationItem {
  id: string;
  name: string;
  amharicName: string;
  region: string;
  distance: string;
  description: string;
  staysCount: number;
  startingPrice: string;
  gradient: string;
  tag: string;
  renderArtwork: () => React.ReactNode;
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: 'addis',
    name: 'Addis Ababa',
    amharicName: 'አዲስ አበባ',
    region: 'Capital & Diplomatic Center',
    distance: 'Bole Intl. Airport Hub',
    description: 'Premier serviced suites in Bole Atlas, Kazanchis diplomatic quarter, and historic residential enclaves in Bisrate Gabriel.',
    staysCount: 142,
    startingPrice: '2,800',
    gradient: 'from-blue-700 via-indigo-800 to-slate-950',
    tag: 'Business & Transit',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <rect x="25" y="20" width="30" height="60" rx="2" fill="#ffffff" opacity="0.9" />
        <rect x="65" y="10" width="30" height="70" rx="2" fill="#ffffff" opacity="0.95" />
        <line x1="32" y1="32" x2="48" y2="32" stroke="#2563eb" strokeWidth="2.5" />
        <line x1="32" y1="44" x2="48" y2="44" stroke="#2563eb" strokeWidth="2.5" />
        <line x1="72" y1="24" x2="88" y2="24" stroke="#2563eb" strokeWidth="2.5" />
        <line x1="72" y1="36" x2="88" y2="36" stroke="#2563eb" strokeWidth="2.5" />
        <line x1="72" y1="48" x2="88" y2="48" stroke="#2563eb" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'bishoftu',
    name: 'Bishoftu (Debre Zeyit)',
    amharicName: 'ቢሾፍቱ',
    region: 'Oromia • Crater Lakes',
    distance: '45 mins via Expressway',
    description: 'Waterfront lodges overlooking Lake Babogaya, Lake Kuriftu, and Lake Bishoftu. Serene weekend getaways and resort spas.',
    staysCount: 78,
    startingPrice: '3,500',
    gradient: 'from-teal-600 via-cyan-800 to-emerald-950',
    tag: 'Crater Lake Getaways',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <path d="M10 75 C30 70, 50 80, 70 72 C90 68, 110 78, 120 72 L120 85 L10 85 Z" fill="#06b6d4" opacity="0.8" />
        <path d="M35 50 L60 25 L85 50 L80 75 L40 75 Z" fill="#ffffff" opacity="0.95" />
        <polygon points="60 18 30 46 90 46" fill="#0d9488" />
        <circle cx="85" cy="28" r="8" fill="#fef08a" />
      </svg>
    ),
  },
  {
    id: 'hawassa',
    name: 'Hawassa',
    amharicName: 'ሀዋሳ',
    region: 'Sidama • Great Rift Valley',
    distance: '3.5 hrs via Expressway',
    description: 'Tranquil accommodations along Lake Hawassa shoreline, famous fish markets, Mount Tabor hiking, and authentic Sidama coffee culture.',
    staysCount: 65,
    startingPrice: '2,400',
    gradient: 'from-amber-600 via-orange-800 to-stone-900',
    tag: 'Lakeside Leisure',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <circle cx="35" cy="62" r="14" fill="#16a34a" opacity="0.85" />
        <circle cx="85" cy="62" r="16" fill="#22c55e" opacity="0.85" />
        <path d="M40 48 L60 28 L80 48 L75 75 L45 75 Z" fill="#ffffff" opacity="0.95" />
        <polygon points="60 22 35 45 85 45" fill="#d97706" />
      </svg>
    ),
  },
  {
    id: 'bahirdar',
    name: 'Bahir Dar & Lake Tana',
    amharicName: 'ባሕር ዳር',
    region: 'Amhara • Source of the Nile',
    distance: 'Daily 45-min flights',
    description: 'Scenic palm-lined avenues, direct access to the Blue Nile Falls (Tis Abay), and ancient island monastery boat tours.',
    staysCount: 52,
    startingPrice: '2,600',
    gradient: 'from-blue-600 via-sky-800 to-indigo-950',
    tag: 'Nile & Monasteries',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <path d="M20 75 C45 70, 75 78, 100 70 L105 85 L15 85 Z" fill="#38bdf8" opacity="0.8" />
        <circle cx="60" cy="45" r="22" fill="#ffffff" opacity="0.95" />
        <polygon points="60 15 70 38 95 38 75 52 82 75 60 62 38 75 45 52 25 38 50 38" fill="#0284c7" />
      </svg>
    ),
  },
  {
    id: 'lalibela',
    name: 'Lalibela',
    amharicName: 'ላሊበላ',
    region: 'Lasta • UNESCO World Heritage',
    distance: 'Direct flights from Addis',
    description: 'Mountain escarpment lodges minutes away from the 11 medieval rock-hewn monolithic churches, including Biete Giyorgis.',
    staysCount: 44,
    startingPrice: '3,200',
    gradient: 'from-amber-700 via-red-900 to-stone-950',
    tag: 'UNESCO Wonder',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <rect x="45" y="20" width="30" height="55" fill="#ffffff" opacity="0.95" rx="2" />
        <rect x="25" y="35" width="70" height="25" fill="#ffffff" opacity="0.95" rx="2" />
        <rect x="52" y="28" width="16" height="40" fill="#b45309" />
        <rect x="32" y="42" width="56" height="12" fill="#b45309" />
      </svg>
    ),
  },
  {
    id: 'gondar',
    name: 'Gondar',
    amharicName: 'ጎንደር',
    region: 'Camelot of Africa',
    distance: 'Simien Mountains Gateway',
    description: 'Historic guesthouses adjacent to Fasil Ghebbi royal compound and Fasilides’ Bath. Gateway to Simien Mountains trekking.',
    staysCount: 39,
    startingPrice: '2,500',
    gradient: 'from-stone-700 via-slate-800 to-stone-950',
    tag: 'Royal Castles',
    renderArtwork: () => (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        <rect x="30" y="30" width="60" height="50" fill="#ffffff" opacity="0.95" rx="2" />
        <polygon points="60 12 25 30 95 30" fill="#475569" />
        <circle cx="60" cy="50" r="10" fill="#2563eb" />
        <rect x="40" y="40" width="8" height="10" fill="#334155" />
        <rect x="72" y="40" width="8" height="10" fill="#334155" />
      </svg>
    ),
  },
];

export default function DestinationsSection({ onSelectDestination }: { onSelectDestination?: () => void }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>SRS FR-05, FR-14 & FR-18: Regional Tourism Hubs</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Explore Ethiopia’s Most Beloved Destinations
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          From the vibrant diplomatic corridors of Addis Ababa to serene rift valley lakes and ancient northern heritage corridors.
        </p>
      </div>

      {/* Destinations Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {DESTINATIONS.map((dest) => (
          <div
            key={dest.id}
            onClick={onSelectDestination}
            className="group bg-white border border-slate-200 hover:border-blue-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
          >
            {/* Visual Artwork Banner */}
            <div className={`h-40 w-full bg-gradient-to-br ${dest.gradient} relative overflow-hidden flex flex-col justify-between p-4 text-white`}>
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-85 group-hover:scale-105 transition-transform duration-300">
                {dest.renderArtwork()}
              </div>

              {/* Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="bg-white/95 text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {dest.tag}
                </span>
                <span className="text-[10px] font-bold text-white/95 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md">
                  {dest.staysCount} verified stays
                </span>
              </div>

              {/* Bottom Details */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/90">
                  {dest.distance}
                </span>
                <span className="text-xs font-bold text-blue-200">
                  From {dest.startingPrice} ETB
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">
                    {dest.name}
                  </h3>
                  <span className="text-xs font-semibold text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded">
                    {dest.amharicName}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium mb-2.5">
                  {dest.region}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {dest.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-[#2563eb]">
                  View Accommodations →
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  24/7 Power & Water Verified
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
