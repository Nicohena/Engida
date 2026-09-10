'use client';

import React, { useState } from 'react';

interface ListingItem {
  id: string;
  title: string;
  category: string;
  location: string;
  distance: string;
  rating: number;
  reviewsCount: number;
  trustScore: number;
  pricePerNight: string;
  hostName: string;
  amenities: string[];
  instantBook: boolean;
  tag?: string;
  gradient: string;
  renderIllustration: () => React.ReactNode;
}

const CATEGORIES = [
  {
    id: 'all',
    name: 'All Stays',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'apartments',
    name: 'Serviced Apartments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <line x1="9" y1="14" x2="9" y2="14.01" />
        <line x1="15" y1="14" x2="15" y2="14.01" />
        <path d="M9 18h6" />
      </svg>
    ),
  },
  {
    id: 'lakeside',
    name: 'Lakeside & Resorts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
        <path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
        <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 4 5 2-2 4-3 4-5a4 4 0 0 0-4-4z" />
      </svg>
    ),
  },
  {
    id: 'villas',
    name: 'Villas & Houses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'guesthouses',
    name: 'Boutique Guesthouses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
        <path d="M2 20h20" />
        <path d="M14 12v.01" />
      </svg>
    ),
  },
  {
    id: 'historic',
    name: 'Historic & Heritage',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 5h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z" />
        <path d="M12 14v8" />
        <path d="M8 22h8" />
      </svg>
    ),
  },
  {
    id: 'airport',
    name: 'Near Airport',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.2-2 1-.3.8-.1 1.7.5 2.2l4.7 3.6-2.5 2.5-2.7-.4c-.5-.1-1 .1-1.3.5-.3.4-.3 1 0 1.4l2.4 2.4 2.4 2.4c.4.3 1 .3 1.4 0 .4-.3.6-.8.5-1.3l-.4-2.7 2.5-2.5 3.6 4.7c.5.6 1.4.8 2.2.5.8-.4 1.2-1.2 1-2z" />
      </svg>
    ),
  },
];

const LISTINGS: ListingItem[] = [
  {
    id: 'stay-1',
    title: 'Atlas Executive Serviced Suite',
    category: 'apartments',
    location: 'Bole Atlas, Addis Ababa',
    distance: '2.4 km from Bole Intl. Airport',
    rating: 4.98,
    reviewsCount: 46,
    trustScore: 99,
    pricePerNight: '4,200',
    hostName: 'Abebe (Superhost)',
    amenities: ['24/7 Generator', 'Water Tank', 'Fiber WiFi'],
    instantBook: true,
    tag: 'Guest Favorite',
    gradient: 'from-blue-600 via-indigo-700 to-slate-900',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <rect x="25" y="15" width="70" height="65" rx="3" fill="#ffffff" opacity="0.95" />
          <rect x="25" y="15" width="70" height="12" fill="#2563eb" />
          <rect x="33" y="34" width="14" height="14" rx="2" fill="#dbeafe" />
          <rect x="53" y="34" width="14" height="14" rx="2" fill="#dbeafe" />
          <rect x="73" y="34" width="14" height="14" rx="2" fill="#dbeafe" />
          <rect x="33" y="54" width="14" height="14" rx="2" fill="#dbeafe" />
          <rect x="53" y="54" width="14" height="14" rx="2" fill="#dbeafe" />
          <rect x="73" y="54" width="14" height="14" rx="2" fill="#dbeafe" />
        </svg>
      </div>
    ),
  },
  {
    id: 'stay-2',
    title: 'Babogaya Lakefront Panoramic Villa',
    category: 'lakeside',
    location: 'Lakefront Shore, Bishoftu',
    distance: 'Direct waterfront dock & terrace',
    rating: 4.95,
    reviewsCount: 38,
    trustScore: 98,
    pricePerNight: '5,800',
    hostName: 'Selamawit (Superhost)',
    amenities: ['Lake View', '24/7 Generator', 'Breakfast'],
    instantBook: true,
    tag: 'Rare Find',
    gradient: 'from-teal-600 via-cyan-700 to-emerald-900',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <path d="M15 75 C35 70, 45 78, 65 72 C85 68, 95 76, 110 70 L110 85 L15 85 Z" fill="#06b6d4" opacity="0.6" />
          <path d="M30 45 L60 22 L90 45 L85 75 L35 75 Z" fill="#ffffff" opacity="0.95" />
          <polygon points="60 16 26 42 94 42" fill="#0d9488" />
          <rect x="52" y="54" width="16" height="21" fill="#1e293b" rx="1" />
          <circle cx="85" cy="30" r="10" fill="#fef08a" opacity="0.9" />
        </svg>
      </div>
    ),
  },
  {
    id: 'stay-3',
    title: 'Diplomatic Studio near UNECA',
    category: 'apartments',
    location: 'Kazanchis, Kirkos, Addis Ababa',
    distance: '450m from UNECA Gate',
    rating: 4.91,
    reviewsCount: 29,
    trustScore: 97,
    pricePerNight: '3,400',
    hostName: 'Dawit (Verified Host)',
    amenities: ['Fiber Internet', 'Dedicated Desk', '24h Guard'],
    instantBook: true,
    tag: 'Popular',
    gradient: 'from-slate-700 via-slate-800 to-slate-950',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <rect x="35" y="20" width="50" height="60" rx="3" fill="#ffffff" opacity="0.95" />
          <line x1="45" y1="32" x2="75" y2="32" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <line x1="45" y1="42" x2="68" y2="42" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="52" x2="72" y2="52" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="65" r="5" fill="#2563eb" />
        </svg>
      </div>
    ),
  },
  {
    id: 'stay-4',
    title: 'Sidama Shore Garden Guesthouse',
    category: 'guesthouses',
    location: 'Tabor Area, Hawassa Lake',
    distance: '80m from Lake Hawassa Trail',
    rating: 4.96,
    reviewsCount: 34,
    trustScore: 99,
    pricePerNight: '2,600',
    hostName: 'Tigist (Superhost)',
    amenities: ['Sidama Coffee', 'Garden View', 'Water Tank'],
    instantBook: false,
    tag: 'Top Rated',
    gradient: 'from-amber-600 via-orange-700 to-stone-900',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <path d="M35 48 L60 25 L85 48 L80 75 L40 75 Z" fill="#ffffff" opacity="0.95" />
          <polygon points="60 18 30 45 90 45" fill="#d97706" />
          <circle cx="28" cy="65" r="12" fill="#22c55e" opacity="0.85" />
          <circle cx="92" cy="65" r="14" fill="#16a34a" opacity="0.85" />
        </svg>
      </div>
    ),
  },
  {
    id: 'stay-5',
    title: 'Old Airport Modern 3-Bedroom Villa',
    category: 'villas',
    location: 'Bisrate Gabriel, Addis Ababa',
    distance: 'Quiet diplomatic enclave',
    rating: 4.99,
    reviewsCount: 58,
    trustScore: 100,
    pricePerNight: '7,500',
    hostName: 'Yared (Superhost)',
    amenities: ['Auto-Generator', 'Private Garage', 'Housekeeper'],
    instantBook: true,
    tag: 'Superhost',
    gradient: 'from-blue-700 via-indigo-800 to-slate-900',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <rect x="25" y="32" width="70" height="46" rx="3" fill="#ffffff" opacity="0.95" />
          <polygon points="60 14 18 34 102 34" fill="#1d4ed8" />
          <rect x="35" y="44" width="14" height="12" rx="1" fill="#bfdbfe" />
          <rect x="71" y="44" width="14" height="12" rx="1" fill="#bfdbfe" />
          <rect x="53" y="54" width="14" height="24" rx="1" fill="#0f172a" />
        </svg>
      </div>
    ),
  },
  {
    id: 'stay-6',
    title: 'Lalibela Escarpment Heritage Lodge',
    category: 'historic',
    location: 'Mountain Ridge, Lalibela',
    distance: '8-min walk to Biete Giyorgis',
    rating: 4.94,
    reviewsCount: 42,
    trustScore: 98,
    pricePerNight: '3,600',
    hostName: 'Mulugeta (Heritage Host)',
    amenities: ['Canyon View', 'Tour Guides', 'Local Breakfast'],
    instantBook: true,
    tag: 'Historic Gem',
    gradient: 'from-amber-700 via-orange-800 to-stone-900',
    renderIllustration: () => (
      <div className="w-full h-full flex items-center justify-center relative">
        <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
          <polygon points="60 20 72 44 98 48 79 66 84 92 60 79 36 92 41 66 22 48 48 44" fill="#f59e0b" opacity="0.85" />
          <circle cx="60" cy="50" r="12" fill="#ffffff" opacity="0.95" />
          <polygon points="60 42 63 48 70 49 65 54 66 60 60 57 54 60 55 54 50 49 57 48" fill="#d97706" />
        </svg>
      </div>
    ),
  },
];

export default function CategoryListingsSection({ onBookClick }: { onBookClick?: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredListings = selectedCategory === 'all'
    ? LISTINGS
    : LISTINGS.filter((l) => l.category === selectedCategory);

  return (
    <section className="w-full py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-slate-900 uppercase mb-1.5">
              EXPLORE ETHIOPIAN STAYS
            </h2>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em]">
              Verified Homes & Boutique Lodges
            </h3>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-800">{filteredListings.length}</strong> verified stays with 24/7 power & water
          </div>
        </div>

        {/* Airbnb-style Category Bar (Exact styling) */}
        <div className="relative mb-8 border-b border-slate-100 pb-1">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-none py-1.5 px-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 py-1.5 px-1 whitespace-nowrap transition-all duration-200 cursor-pointer group border-b-2 -mb-1 ${
                    isActive
                      ? 'border-[#2563eb] text-[#2563eb]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#2563eb]' : 'text-slate-500 group-hover:text-slate-800'}`}>
                    {cat.icon}
                  </div>
                  <span className={`text-xs tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredListings.map((item) => {
            const isFav = favorites[item.id] || false;

            return (
              <div
                key={item.id}
                onClick={onBookClick}
                className="group bg-white border border-slate-200 hover:border-blue-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
              >
                {/* Visual Header / Artwork */}
                <div className={`h-36 sm:h-40 w-full bg-gradient-to-br ${item.gradient} relative overflow-hidden flex flex-col justify-between p-3.5 text-white`}>
                  
                  {/* Subtle Background Geometry */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />

                  {/* Artwork vector illustration */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-85 group-hover:scale-105 transition-transform duration-300">
                    {item.renderIllustration()}
                  </div>

                  {/* Top Badges Row */}
                  <div className="relative z-10 flex items-center justify-between">
                    {item.tag ? (
                      <span className="bg-white/95 backdrop-blur-xs text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                        {item.tag}
                      </span>
                    ) : <span />}

                    {/* Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      aria-label="Save stay"
                      className="w-7 h-7 rounded-full bg-black/25 backdrop-blur-xs flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-colors shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom Trust Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-white/90 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {item.distance}
                    </span>
                    <span className="text-[10px] font-bold bg-[#2563eb] text-white px-2 py-0.5 rounded-md border border-white/20 shadow-2xs">
                      ★ {item.trustScore}% Trust
                    </span>
                  </div>

                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Location & Star Rating */}
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 truncate">{item.location}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-amber-500 text-xs">★</span>
                        <span className="font-bold text-slate-800">{item.rating}</span>
                        <span className="text-slate-400 text-[10px]">({item.reviewsCount})</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-[#2563eb] transition-colors line-clamp-1 mb-2">
                      {item.title}
                    </h4>

                    {/* Amenities Checklist */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {item.amenities.map((am, idx) => (
                        <span key={idx} className="text-[9px] font-semibold bg-slate-50 text-slate-600 border border-slate-200/80 px-1.5 py-0.5 rounded">
                          {am.includes('Generator') && '⚡ '}
                          {am.includes('Water') && '💧 '}
                          {am.includes('Coffee') && '☕ '}
                          {am.includes('Fiber') && '📶 '}
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price & Booking Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <div>
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        {item.pricePerNight} <span className="text-xs font-semibold text-slate-500">ETB</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">night</span>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-[#2563eb] text-[#2563eb] hover:text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-2xs group-hover:bg-[#2563eb] group-hover:text-white"
                    >
                      Instant Book
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
