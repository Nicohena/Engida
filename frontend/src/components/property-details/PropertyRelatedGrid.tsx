'use client';

import React from 'react';
import Link from 'next/link';
import type { Property } from '../../types';

interface PropertyRelatedGridProps {
  properties: Property[];
}

const typeLabels: Record<string, string> = {
  HOUSE: 'House',
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  BEDROOM: 'Bedroom',
  STUDIO: 'Studio',
};

export default function PropertyRelatedGrid({ properties }: PropertyRelatedGridProps) {
  if (properties.length === 0) return null;

  return (
    <section className="py-10 border-t border-slate-100 mt-6">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase font-mono">
          MORE ETHIOPIAN STAYS
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em] mt-0.5">
          Explore Other Verified Properties
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explore other verified homes with similar features, locations, or price ranges.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {properties.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between transform hover:-translate-y-1"
          >
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
              {property.coverImage ? (
                <img
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  src={property.coverImage}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                  No Image
                </div>
              )}
              <span className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                {typeLabels[property.propertyType] || property.propertyType}
              </span>
              <span className="absolute bottom-2.5 right-2.5 bg-[#2563eb] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                ★ 98% Trust
              </span>
            </div>
            <div className="p-3.5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#2563eb] transition-colors truncate">
                  {property.title}
                </h4>
                <p className="text-xs text-slate-500 mb-2">
                  {property.city}, {property.country}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>${parseFloat(property.pricePerNight).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ night</span></span>
                <span className="text-slate-400 font-medium text-[11px]">
                  {property.bedrooms} Bed{property.bedrooms !== 1 ? 's' : ''} • {property.bathrooms} Bath{property.bathrooms !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
