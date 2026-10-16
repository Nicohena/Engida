'use client';

import React from 'react';
import type { Property } from '../../types';

interface PropertyQuickDetailsProps {
  property: Property;
}

export default function PropertyQuickDetails({ property }: PropertyQuickDetailsProps) {
  const specs = [
    {
      label: `${property.bedrooms} Bedroom${property.bedrooms !== 1 ? 's' : ''}`,
      icon: (
        <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: `${property.bathrooms} Bathroom${property.bathrooms !== 1 ? 's' : ''}`,
      icon: (
        <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    ...(property.parkingSpaces > 0
      ? [
          {
            label: `${property.parkingSpaces} Parking Space${property.parkingSpaces !== 1 ? 's' : ''}`,
            icon: (
              <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            ),
          },
        ]
      : []),
    ...(property.areaSqm > 0
      ? [
          {
            label: `${property.areaSqm} sqm living area`,
            icon: (
              <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="py-4 border-b border-slate-100 pb-8">
      <div className="mb-2">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase font-mono">
          PROPERTY OVERVIEW
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em] mt-0.5">
          Quick Property Details
        </h2>
      </div>

      {/* Specs Chips */}
      <div className="flex flex-wrap items-center gap-2.5 my-4">
        {specs.map((spec, i) => (
          <div
            key={i}
            className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs"
          >
            {spec.icon}
            <span>{spec.label}</span>
          </div>
        ))}
      </div>

      {/* Meta Status and CTA Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 mt-6">
        <div className="space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1.5 font-bold font-mono">
              Property Status
            </span>
            {property.isAvailable ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Available Now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                Currently Booked
              </span>
            )}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1.5 font-bold font-mono">
              Property Category
            </span>
            <span className="inline-block bg-blue-50 text-[#2563eb] border border-blue-100 text-xs font-bold px-3 py-1 rounded-full capitalize">
              {property.propertyType.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-2.5 md:justify-end">
          <button
            className="px-5 py-3 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all text-center shadow-xs cursor-pointer active:scale-[0.98]"
            type="button"
          >
            Schedule a Tour
          </button>
          <button
            className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all text-center shadow-2xs cursor-pointer active:scale-[0.98]"
            type="button"
          >
            Contact Agent
          </button>
        </div>
      </div>
    </section>
  );
}
