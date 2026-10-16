'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanding } from '../../context/LandingContext';

const POPULAR_DESTINATIONS = [
  { name: 'Bole, Addis Ababa', sub: 'Edna Mall, Atlas, Airport', stays: '142 stays' },
  { name: 'Kazanchis, Kirkos', sub: 'UNECA, Intercontinental, Meskel Sq', stays: '89 stays' },
  { name: 'Bishoftu (Debre Zeyit)', sub: 'Crater Lakes, Resorts & Spas', stays: '78 stays' },
  { name: 'Hawassa Lakefront', sub: 'Lakeside Leisure & Tabor', stays: '65 stays' },
  { name: 'Old Airport / Sarbet', sub: 'Bisrate Gabriel, Residential', stays: '51 stays' },
  { name: 'Lalibela & Gondar', sub: 'Historic UNESCO Heritage', stays: '60 stays' },
];

export default function HeroSearchBar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { calendarType, searchDestination, setSearchDestination } = useLanding();

  const [locationOpen, setLocationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const [adults, setAdults] = useState(2);
  const [checkIn, setCheckIn] = useState(calendarType === 'ethiopian' ? 'መስከረም 18' : 'Sep 28');
  const [checkOut, setCheckOut] = useState(calendarType === 'ethiopian' ? 'መስከረም 24' : 'Oct 04');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
        setDatesOpen(false);
        setGuestsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (calendarType === 'ethiopian') {
      setCheckIn('መስከረም 18');
      setCheckOut('መስከረም 24');
    } else {
      setCheckIn('Sep 28');
      setCheckOut('Oct 04');
    }
  }, [calendarType]);

  const handleSearch = () => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      const step2 = document.getElementById('steps-section');
      if (step2) {
        step2.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto relative z-40">
      {/* Sleek Floating Pill Search Bar (Matching Video Aesthetics) */}
      <div className="bg-white/95 backdrop-blur-xs rounded-full shadow-lg hover:shadow-xl border border-slate-200/90 p-1.5 sm:p-2 transition-all duration-300">
        <div className="flex items-center justify-between divide-x divide-slate-100 text-left">
          
          {/* Destination Section */}
          <div className="relative flex-1 px-3 sm:px-4 py-1">
            <button
              type="button"
              onClick={() => {
                setLocationOpen(!locationOpen);
                setDatesOpen(false);
                setGuestsOpen(false);
              }}
              className="w-full text-left cursor-pointer group"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#2563eb] transition-colors">
                Where
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {searchDestination || 'Bole, Hawassa, Bishoftu...'}
              </span>
            </button>

            {/* Dropdown */}
            {locationOpen && (
              <div className="absolute left-0 top-full mt-3 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Popular Ethiopian Destinations
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {POPULAR_DESTINATIONS.map((dest, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchDestination(dest.name);
                        setLocationOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/60 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563eb]">
                          {dest.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{dest.sub}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                        {dest.stays}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dates Section */}
          <div className="relative px-3 sm:px-4 py-1 flex-1">
            <button
              type="button"
              onClick={() => {
                setDatesOpen(!datesOpen);
                setLocationOpen(false);
                setGuestsOpen(false);
              }}
              className="w-full text-left cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#2563eb] transition-colors">
                  When
                </span>
                
              </div>
              <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {checkIn} — {checkOut}
              </span>
            </button>

            {datesOpen && (
              <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50">
                <div className="text-xs font-bold text-slate-900 mb-2">
                  {calendarType === 'ethiopian' ? 'የኢትዮጵያ ዘመን አቆጣጠር' : 'Gregorian Calendar'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="border border-slate-200 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">Check-in</span>
                    <span className="font-bold text-slate-800">{checkIn}</span>
                  </div>
                  <div className="border border-slate-200 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">Check-out</span>
                    <span className="font-bold text-slate-800">{checkOut}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDatesOpen(false)}
                  className="w-full py-1.5 bg-[#2563eb] text-white rounded-lg text-xs font-semibold hover:bg-[#1d4ed8] transition-colors"
                >
                  Confirm Dates
                </button>
              </div>
            )}
          </div>

          {/* Guests Section */}
          <div className="relative px-3 sm:px-4 py-1 hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setGuestsOpen(!guestsOpen);
                setLocationOpen(false);
                setDatesOpen(false);
              }}
              className="w-full text-left cursor-pointer group"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#2563eb] transition-colors">
                Who
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-slate-800">
                {adults} Guests
              </span>
            </button>

            {guestsOpen && (
              <div className="absolute right-0 top-full mt-3 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Guests</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(adults + 1)}
                      className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Button (Blue Glow Button matching video style) */}
          <div className="pl-2 pr-1">
            <button
              type="button"
              onClick={handleSearch}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 glow-blue shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Find Stays</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
