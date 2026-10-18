'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface DestinationItem {
  id: string;
  name: string;
  city: string;
  gradient: string;
  renderArtwork: () => React.ReactNode;
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: 'addis',
    name: 'Addis Ababa',
    city: 'Addis Ababa',
    gradient: 'from-blue-700 via-indigo-800 to-slate-950',
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
    city: 'Bishoftu',
    gradient: 'from-teal-600 via-cyan-800 to-emerald-950',
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
    city: 'Hawassa',
    gradient: 'from-amber-600 via-orange-800 to-stone-900',
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
    city: 'Bahir Dar',
    gradient: 'from-blue-600 via-sky-800 to-indigo-950',
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
    city: 'Lalibela',
    gradient: 'from-amber-700 via-red-900 to-stone-950',
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
    city: 'Gondar',
    gradient: 'from-stone-700 via-slate-800 to-stone-950',
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

interface DestinationListingsResponse {
  data: { pricePerNight: string | number }[];
  total: number;
}

export default function DestinationsSection({ onSelectDestination }: { onSelectDestination?: () => void }) {
  const [listingStats, setListingStats] = useState<Record<string, { count: number; startingPrice: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all(DESTINATIONS.map(async (destination) => {
      const params = new URLSearchParams({
        city: destination.city,
        listingType: 'RENTAL',
        limit: '1',
        sortBy: 'pricePerNight',
        sortOrder: 'ASC',
      });
      const response = await apiFetch<DestinationListingsResponse>(`/properties?${params.toString()}`, { skipAuth: true });
      return {
        city: destination.city,
        count: response.total,
        startingPrice: Number(response.data[0]?.pricePerNight ?? 0),
      };
    }))
      .then((stats) => {
        if (!active) return;
        setListingStats(Object.fromEntries(stats.map((item) => [item.city, {
          count: item.count,
          startingPrice: item.startingPrice,
        }])));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load destination listings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const availableDestinations = useMemo(
    () => DESTINATIONS.filter((destination) => (listingStats[destination.city]?.count ?? 0) > 0),
    [listingStats],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>Published rental listings by city</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find a rental by destination
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          Browse current host listings and compare the starting nightly price in each destination.
        </p>
      </div>

      {loading ? (
        <div role="status" className="py-12 text-center text-sm text-slate-500">Loading available destinations…</div>
      ) : error ? (
        <div role="alert" className="py-8 text-center text-sm text-red-700">{error}</div>
      ) : availableDestinations.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="font-semibold text-slate-900">No published rental listings in these destinations yet.</h3>
          <p className="mt-1 text-sm text-slate-600">New destinations will appear here when hosts publish available rentals.</p>
        </div>
      ) : (
      /* Destinations Cards Grid */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {availableDestinations.map((dest) => (
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
              <div className="relative z-10 flex items-center justify-end">
                <span className="text-[10px] font-bold text-white/95 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md">
                  {listingStats[dest.city]?.count ?? 0} published rental{listingStats[dest.city]?.count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-end">
                <span className="text-xs font-bold text-blue-200">
                  From ETB {listingStats[dest.city]?.startingPrice.toLocaleString()}/night
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="mb-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">
                    {dest.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {listingStats[dest.city]?.count ?? 0} published rental listing{listingStats[dest.city]?.count === 1 ? '' : 's'} in {dest.city}.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-[#2563eb]">
                  View Accommodations →
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Host-listed rentals
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>
      )}

    </div>
  );
}
