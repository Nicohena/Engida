'use client';

import React from 'react';
import type { Amenity } from '../../types';

interface PropertyFeaturesAmenitiesProps {
  amenities: Amenity[];
}

// Categorize amenities into groups for the 3-column layout
function categorizeAmenities(amenities: Amenity[]) {
  const interior = ['Wi-Fi', 'Kitchen', 'Air Conditioning', 'TV', 'Smart Home', 'Washing Machine'];
  const outdoor = ['Swimming Pool', 'Free Parking', 'Garden', 'Hot Water'];
  const building = ['Security', 'Elevator', 'Fitness Center', 'Wine Cellar'];

  const interiorList: Amenity[] = [];
  const outdoorList: Amenity[] = [];
  const buildingList: Amenity[] = [];

  for (const amenity of amenities) {
    if (interior.includes(amenity.name)) {
      interiorList.push(amenity);
    } else if (outdoor.includes(amenity.name)) {
      outdoorList.push(amenity);
    } else if (building.includes(amenity.name)) {
      buildingList.push(amenity);
    } else {
      interiorList.push(amenity);
    }
  }

  return { interiorList, outdoorList, buildingList };
}

function AmenityItem({ name }: { name: string }) {
  return (
    <li className="flex items-center space-x-2.5">
      <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-slate-700 text-xs sm:text-sm font-medium">{name}</span>
    </li>
  );
}

export default function PropertyFeaturesAmenities({ amenities }: PropertyFeaturesAmenitiesProps) {
  const { interiorList, outdoorList, buildingList } = categorizeAmenities(amenities);

  return (
    <section className="py-8 border-b border-slate-100">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase font-mono">
          COMFORT &amp; CONVENIENCE
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em] mt-0.5">
          Features &amp; Amenities
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        {/* Interior Features */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200/80 pb-2.5 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            Interior Features
          </h3>
          <ul className="space-y-2.5">
            {interiorList.length > 0 ? (
              interiorList.map((a) => <AmenityItem key={a.id} name={a.name} />)
            ) : (
              <li className="text-slate-400 text-xs">No interior features listed</li>
            )}
          </ul>
        </div>

        {/* Outdoor Features */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200/80 pb-2.5 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            Outdoor Features
          </h3>
          <ul className="space-y-2.5">
            {outdoorList.length > 0 ? (
              outdoorList.map((a) => <AmenityItem key={a.id} name={a.name} />)
            ) : (
              <li className="text-slate-400 text-xs">No outdoor features listed</li>
            )}
          </ul>
        </div>

        {/* Building Amenities */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200/80 pb-2.5 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            Building Amenities
          </h3>
          <ul className="space-y-2.5">
            {buildingList.length > 0 ? (
              buildingList.map((a) => <AmenityItem key={a.id} name={a.name} />)
            ) : (
              <li className="text-slate-400 text-xs">No building amenities listed</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
