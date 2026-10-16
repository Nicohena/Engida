'use client';

import React, { useState } from 'react';

interface SubCityRate {
  id: string;
  name: string;
  location: string;
  baseVilla: number;
  baseApartment: number;
  baseStudio: number;
}

const SUB_CITIES: SubCityRate[] = [
  { id: 'bole', name: 'Bole Atlas / Airport', location: 'Addis Ababa', baseVilla: 7500, baseApartment: 4200, baseStudio: 2800 },
  { id: 'kazanchis', name: 'Kazanchis / UNECA', location: 'Addis Ababa', baseVilla: 6800, baseApartment: 3600, baseStudio: 2500 },
  { id: 'old-airport', name: 'Bisrate Gabriel / Sarbet', location: 'Addis Ababa', baseVilla: 8200, baseApartment: 4500, baseStudio: 3000 },
  { id: 'bishoftu', name: 'Crater Lake Shore', location: 'Bishoftu (Debre Zeyit)', baseVilla: 6000, baseApartment: 3800, baseStudio: 2400 },
  { id: 'hawassa', name: 'Lakefront Promenade', location: 'Hawassa', baseVilla: 5500, baseApartment: 3200, baseStudio: 2200 },
  { id: 'bahirdar', name: 'Lake Tana Peninsula', location: 'Bahir Dar', baseVilla: 5000, baseApartment: 3000, baseStudio: 2000 },
];

const PROPERTY_TYPES = [
  { id: 'villa', name: 'Entire House / Villa', key: 'baseVilla' as const, desc: '3+ Bedrooms, Garden & Gated Parking' },
  { id: 'apartment', name: 'Serviced 2-Bed Suite', key: 'baseApartment' as const, desc: 'Modern high-rise with backup generator' },
  { id: 'studio', name: 'Boutique Studio / Room', key: 'baseStudio' as const, desc: 'Private bathroom & high-speed WiFi' },
];

export default function HostEarningsSection({ onExploreStays }: { onExploreStays?: () => void }) {
  const [selectedCityId, setSelectedCityId] = useState<string>('bole');
  const [propertyType, setPropertyType] = useState<'villa' | 'apartment' | 'studio'>('apartment');
  const [nightsBooked, setNightsBooked] = useState<number>(18);
  const [selectedPayout, setSelectedPayout] = useState<string>('telebirr');

  const currentCity = SUB_CITIES.find((c) => c.id === selectedCityId) || SUB_CITIES[0];
  const activeTypeObj = PROPERTY_TYPES.find((t) => t.id === propertyType) || PROPERTY_TYPES[1];
  const nightlyRate = currentCity[activeTypeObj.key];
  const monthlyRevenue = nightlyRate * nightsBooked;
  const annualEstimate = monthlyRevenue * 12;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse" />
          <span>SRS FR-02 & FR-12: Dynamic Host Acquisition Engine</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Turn Your Ethiopian Property into Steady Income
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          List your furnished apartment, villa, or boutique guesthouse. Retain 100% control over pricing with smart dynamic pricing recommendations and zero listing fees.
        </p>
      </div>

      {/* Main Interactive Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Control Column (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          
          {/* Step 1: Select Ethiopian Destination */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              1. Select Location / Ethiopian Sub-City
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SUB_CITIES.map((city) => {
                const isSelected = city.id === selectedCityId;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setSelectedCityId(city.id)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2563eb] bg-blue-50/60 shadow-xs ring-1 ring-[#2563eb]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`text-xs font-bold ${isSelected ? 'text-[#2563eb]' : 'text-slate-900'}`}>
                      {city.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {city.location}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Property Type */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              2. Choose Property Configuration
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PROPERTY_TYPES.map((type) => {
                const isSelected = propertyType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPropertyType(type.id as any)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2563eb] bg-blue-50/60 shadow-xs ring-1 ring-[#2563eb]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`text-xs font-bold ${isSelected ? 'text-[#2563eb]' : 'text-slate-900'}`}>
                      {type.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                      {type.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Estimated Monthly Occupancy Slider */}
          <div className="mb-6 pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Estimated Booked Nights / Month
              </label>
              <span className="text-sm font-black text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {nightsBooked} Nights (~{Math.round((nightsBooked / 30) * 100)}% occupancy)
              </span>
            </div>
            
            <input
              type="range"
              min="4"
              max="28"
              step="1"
              value={nightsBooked}
              onChange={(e) => setNightsBooked(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
            />
            
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>Weekend Only (4-8 nights)</span>
              <span>Average (15-20 nights)</span>
              <span>High Occupancy (25+ nights)</span>
            </div>
          </div>

          {/* Guaranteed Local Settlement Channel */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-600 mb-2">
              Direct Settlement Channels (FR-07):
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'telebirr', name: 'Telebirr Wallet', fee: 'Instant Deposit' },
                { id: 'cbe', name: 'Commercial Bank of Ethiopia (CBE)', fee: 'Direct Account' },
                { id: 'awash', name: 'Awash Bank / Birr', fee: 'Automated Wire' },
                { id: 'dashen', name: 'Dashen Bank / Amole', fee: 'Fast Payout' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPayout(method.id)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                    selectedPayout === method.id
                      ? 'border-[#2563eb] bg-blue-50 text-[#2563eb] font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {method.name} <span className="text-[9px] opacity-75">• {method.fee}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Revenue Summary Card (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
          
          {/* Subtle Background Mesh */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563eb]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                Earnings Simulation
              </span>
              <span className="text-[10px] font-extrabold bg-[#2563eb] text-white px-2.5 py-1 rounded-full">
                0% Listing Fee
              </span>
            </div>

            {/* Nightly breakdown */}
            <div className="text-xs text-slate-300 mb-1">
              Estimated Nightly Rate in {currentCity.name}:
            </div>
            <div className="text-2xl font-black text-white mb-4">
              {nightlyRate.toLocaleString()} <span className="text-sm font-medium text-slate-300">ETB / night</span>
            </div>

            <div className="h-px bg-white/10 w-full mb-5" />

            {/* Monthly Total */}
            <div className="text-xs text-slate-300 mb-1">
              Estimated Monthly Revenue ({nightsBooked} nights):
            </div>
            <div className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none mb-1 text-emerald-400">
              {monthlyRevenue.toLocaleString()} <span className="text-base font-bold text-white/90">ETB</span>
            </div>
            <div className="text-[11px] text-slate-400 mb-6">
              ~{annualEstimate.toLocaleString()} ETB estimated annualized revenue
            </div>

            {/* Platform Guarantees Checklist */}
            <div className="space-y-2.5 mb-8 text-xs text-slate-200">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Kebele/Passport KYC:</strong> Every guest is identity-verified before checking in (FR-01).</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Escrow Protection:</strong> Funds secured before guest arrival and deposited 24h post check-in (FR-07).</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Smart Dynamic Pricing:</strong> Free algorithmic demand guidance for holidays & AU Summits (FR-12).</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onExploreStays}
              className="flex-1 py-3 px-5 bg-[#2563eb] hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all text-center shadow-md cursor-pointer"
            >
              Start Host Onboarding
            </button>
            <button
              type="button"
              onClick={onExploreStays}
              className="py-3 px-4 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer border border-white/10"
            >
              View Active Stays
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
